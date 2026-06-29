import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notification } from 'antd';
import ConfirmModal from '../../components/admin/ConfirmModal';
import ProductsService from '../../services/ProductsService';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')}₫`;
};

const getCurrentPrice = (price, discount) => {
  const basePrice = Number(price || 0);
  const discountPrice = Number(discount || 0);
  return discountPrice > 0 ? discountPrice : basePrice;
};



const AdminProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const formatVariantAttributes = (variant) => {
    const values = variant.attribute_values ?? variant.attributeValues ?? variant.attributes ?? [];
    if (Array.isArray(values)) {
      return values
        .map((item) => item?.display_value ?? item?.displayValue ?? item?.display_name ?? item?.value ?? item?.name ?? item?.label ?? '')
        .filter(Boolean)
        .join(', ') || '-';
    }
    if (typeof values === 'object' && values !== null) {
      return Object.values(values).filter(Boolean).join(', ') || '-';
    }
    return '-';
  };

  const getCategoryName = (productData) => {
    if (!productData) return 'Chưa có danh mục';
    if (Array.isArray(productData.categories) && productData.categories.length > 0) {
      return productData.categories
        .map((category) => {
          if (typeof category === 'string') return category;
          return category?.name ?? category?.title ?? category?.slug ?? category?.label ?? '';
        })
        .filter(Boolean)
        .join(', ') || 'Chưa có danh mục';
    }
    if (typeof productData.category === 'string') return productData.category;
    if (productData.category && typeof productData.category === 'object') {
      return productData.category?.name ?? productData.category?.title ?? productData.category?.slug ?? productData.category?.label ?? 'Chưa có danh mục';
    }
    return 'Chưa có danh mục';
  };

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ProductsService.getProduct(id);
        setProduct(data);
      } catch (err) {
        setError('Không thể tải thông tin sản phẩm.');
        console.error('Product detail fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const getVariantPrice = (variant) => {
    if (variant?.price !== undefined && variant?.price !== null && variant?.price !== '') {
      return Number(variant.price);
    }
    return Number(product?.price || 0);
  };

  const getVariantDiscount = (variant) => {
    if (variant?.discount_price !== undefined && variant?.discount_price !== null && variant?.discount_price !== '') {
      return Number(variant.discount_price);
    }
    return Number(product?.discount_price || 0);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleteModalOpen(false);
    if (!product) return;

    try {
      await ProductsService.deleteProduct(product.id);
      notification.success({
        message: 'Xóa sản phẩm thành công',
        description: 'Sản phẩm đã được xóa khỏi hệ thống.',
      });
      navigate('/admin/products');
    } catch (err) {
      notification.error({
        message: 'Xóa sản phẩm thất bại',
        description: err.response?.data?.message || err.message || 'Vui lòng thử lại.',
      });
      console.error('Delete product failed:', err);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  if (loading) {
    return (
      <main className="pt-16 min-h-screen bg-surface">
        <div className="max-w-[1280px] mx-auto p-gutter text-center text-on-surface-variant">
          Đang tải chi tiết sản phẩm...
        </div>
      </main>
    );
  }

  return (
    <main className="pt-16 min-h-screen bg-surface">
      <div className="max-w-[1280px] mx-auto p-gutter space-y-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
              <div>
                <h1 className="font-headline-md text-headline-md text-on-background">Chi tiết sản phẩm</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Xem và quản lý thông tin sản phẩm.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <button
                  onClick={() => navigate('/admin/products')}
                  className="w-full rounded-lg border border-outline bg-surface px-lg py-sm text-on-surface transition hover:bg-surface-container sm:w-auto"
                >
                  Quay lại danh sách
                </button>
                <button
                  onClick={() => navigate(`/admin/products/${id}/edit`)}
                  className="w-full rounded-lg bg-primary px-lg py-sm text-on-primary transition hover:bg-primary-container sm:w-auto"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full rounded-lg bg-error px-lg py-sm text-on-error transition hover:bg-error-container sm:w-auto"
                >
                  Xóa
                </button>
              </div>
            </div>
            <ConfirmModal
              isOpen={isDeleteModalOpen}
              title="Xác nhận xóa sản phẩm"
              message="Bạn có chắc chắn muốn xóa sản phẩm này?"
              confirmText="Xóa"
              cancelText="Hủy"
              isDangerous
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
            />

            {error ? (
              <div className="rounded-lg border border-error-container bg-error-container/10 p-md text-error">
                {error}
              </div>
            ) : product ? (
              <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant p-lg space-y-lg">
                <div className="grid gap-lg lg:grid-cols-2">
                  <div className="h-72 overflow-hidden rounded-3xl border border-outline-variant bg-surface-container sm:h-96 lg:h-105">
                    <img
                      alt={product.name}
                      src={product.image}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-md">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">{product.name}</h2>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{getCategoryName(product)}</p>
                    </div>
                    <div className="rounded-3xl border border-outline-variant bg-surface-container p-lg shadow-sm">
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="font-label-sm text-label-sm text-on-surface-variant">Giá hiện tại</p>
                          <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                            {formatCurrency(getCurrentPrice(product.price, product.discount_price))}
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="rounded-2xl bg-surface-container-lowest p-4 text-center">
                            <p className="font-label-xs text-xs text-on-surface-variant">Giá gốc</p>
                            <p className="font-body-sm text-body-sm text-on-surface font-semibold mt-2">{formatCurrency(product.price)}</p>
                          </div>
                          <div className="rounded-2xl bg-surface-container-lowest p-4 text-center sm:col-span-1 lg:col-span-2">
                            <p className="font-label-xs text-xs text-on-surface-variant">Giá khuyến mãi</p>
                            <p className="font-body-sm text-body-sm text-red-700 font-semibold mt-2 ">{product.discount_price ? formatCurrency(product.discount_price) : '0₫'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-sm">
                      <h3 className="font-label-md text-label-md text-on-surface">Mô tả</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">
                        {product.description || 'Không có mô tả.'}
                      </p>
                    </div>
                  </div>
                </div>

                {Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="space-y-md">
                    <h3 className="font-label-md text-label-md text-on-surface">Biến thể</h3>
                    <div className="overflow-x-auto rounded-3xl border border-outline-variant bg-surface-container p-0">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-outline-variant bg-surface-container-low">
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Ảnh</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">SKU</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Biến thể</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Giá gốc</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Giá khuyến mãi</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Giá bán</th>
                            <th className="px-md py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Số lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.variants.map((variant) => {
                            const variantPrice = getVariantPrice(variant);
                            const variantDiscount = getVariantDiscount(variant);
                            return (
                              <tr key={variant.id ?? variant.sku ?? variant.rowId} className="border-b border-outline-variant last:border-b-0">
                                <td className="px-md py-3">
                                  <img
                                    src={variant.image || product.image}
                                    alt={`Ảnh biến thể ${formatVariantAttributes(variant)}`}
                                    className="h-14 w-14 rounded-lg border border-outline-variant object-cover"
                                  />
                                </td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{variant.sku}</td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{formatVariantAttributes(variant)}</td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{formatCurrency(variantPrice)}</td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-red-700">{variantDiscount > 0 ? formatCurrency(variantDiscount) : '0₫'}</td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-on-surface font-semibold">{formatCurrency(getCurrentPrice(variantPrice, variantDiscount))}</td>
                                <td className="px-md py-3 font-body-sm text-body-sm text-on-surface">{variant.stock ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-outline-variant bg-surface-container p-md text-on-surface-variant">
                Sản phẩm không tồn tại hoặc đã bị xóa.
              </div>
            )}
      </div>
    </main>
  );
};

export default AdminProductDetailPage;
