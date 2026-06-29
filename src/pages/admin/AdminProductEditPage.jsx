import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadOutlined } from '@ant-design/icons';
import { Button, notification, Upload } from 'antd';
import PageHeader from '../../components/admin/PageHeader';
import AttributeService from '../../services/AttributeService';
import ProductsService from '../../services/ProductsService';

const getUploadedImageUrl = (response) =>
  response?.data?.image_url ??
  response?.data?.url ??
  response?.image_url ??
  response?.url ??
  null;

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload == null) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

const getCurrentPrice = (price, discount) => {
  const basePrice = Number(price || 0);
  const discountPrice = Number(discount || 0);
  return discountPrice > 0 ? discountPrice : basePrice;
};

const getAttributeTypeId = (item) => {
  return (
    item?.attribute_type_id ??
    item?.attribute_type?.id ??
    item?.attribute_type?.attribute_id ??
    item?.attribute_type ??
    item?.attributeType?.id ??
    item?.attributeType?.attribute_id ??
    item?.attributeType ??
    item?.type_id ??
    item?.typeId ??
    item?.attributeTypeId
  );
};

const getAttributeValueId = (item) => {
  return (
    item?.attribute_value_id ??
    item?.id ??
    item?.value ??
    item?.attribute_value?.id ??
    item?.attribute_value?.value ??
    item?.display_value ??
    item?.value_id ??
    item?.valueId
  );
};

const extractVariantAttributes = (variant) => {
  const values = {};
  const attrs = variant?.attributeValues ?? variant?.attribute_values ?? variant?.attributes ?? [];
  const items = Array.isArray(attrs) ? attrs : typeof attrs === 'object' && attrs !== null ? Object.values(attrs) : [];

  items.forEach((item) => {
    const typeId = getAttributeTypeId(item);
    const valueId = getAttributeValueId(item);
    if (typeId != null && valueId != null) {
      values[String(typeId)] = String(valueId);
    }
  });

  return values;
};

const buildVariantSku = (productName, row, attributeTypes) => {
  const labels = Object.entries(row.attributes)
    .map(([attributeId, valueId]) => {
      const type = attributeTypes.find((type) => type.id === Number(attributeId));
      const value = (type?.attributeValues || []).find(
        (item) => String(item.id ?? item.attribute_value_id ?? item.value) === String(valueId)
      );
      return value?.value ?? value?.name ?? value?.label ?? '';
    })
    .filter(Boolean);

  const normalizedName = String(productName || 'variant')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();

  const normalizedAttributes = labels
    .join('-')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();

  const base = normalizedName ? `${normalizedName}-${normalizedAttributes}` : normalizedAttributes;
  return base ? `${base}-${row.rowId}` : `VARIANT-${row.rowId}`;
};

const AdminProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [variantRows, setVariantRows] = useState([
    {
      rowId: 'variant-1',
      variant_id: null,
      sku: '',
      stock: '',
      price: '',
      discount_price: '',
      image: '',
      imagePreview: '',
      isUploadingImage: false,
      attributes: {},
    },
  ]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    image: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [productData, categoryList, attributeList] = await Promise.all([
          ProductsService.getProduct(id),
          ProductsService.getCategories(),
          AttributeService.getAllAttributes(),
        ]);

        setFormData({
          name: productData?.name || '',
          description: productData?.description || '',
          price: productData?.price ?? '',
          discount_price: productData?.discount_price ?? '',
          image: productData?.image || '',
        });

        const categoryIds = Array.isArray(productData?.categories)
          ? productData.categories
              .map((category) => category?.id ?? category?._id ?? category?.categoryId)
              .filter((categoryId) => categoryId != null)
              .map(Number)
          : [];
        setSelectedCategoryIds(categoryIds);

        const categoriesArray = normalizeArray(categoryList);
        setCategories(categoriesArray);

        const attrPayload = normalizeArray(attributeList).map((type) => ({
          id: type.id ?? type.attribute_id ?? type._id,
          name: type.name ?? type.title ?? 'Thuộc tính',
          attributeValues: Array.isArray(type.attributeValues)
            ? type.attributeValues
            : Array.isArray(type.attribute_values)
            ? type.attribute_values
            : Array.isArray(type.values)
            ? type.values
            : [],
        }));
        setAttributeTypes(attrPayload);

        const initialVariantRows = Array.isArray(productData?.variants)
          ? productData.variants.map((variant, index) => ({
              rowId: variant.id ? `variant-${variant.id}` : `variant-new-${index}`,
              variant_id: variant.id ?? null,
              sku: variant.sku ?? '',
              stock: variant.stock ?? '',
              price: variant.price ?? '',
              discount_price: variant.discount_price ?? '',
              image: variant.image ?? '',
              imagePreview: '',
              isUploadingImage: false,
              attributes: extractVariantAttributes(variant),
            }))
          : [];

        setVariantRows(initialVariantRows.length ? initialVariantRows : [
          {
            rowId: 'variant-1',
            variant_id: null,
            sku: '',
            stock: '',
            price: '',
            discount_price: '',
            image: '',
            imagePreview: '',
            isUploadingImage: false,
            attributes: {},
          },
        ]);
      } catch (err) {
        setError('Không thể tải thông tin sản phẩm để chỉnh sửa.');
        console.error('Product edit fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // When product name changes, regenerate SKUs for all variants
    if (field === 'name') {
      setVariantRows((prev) =>
        prev.map((row) => ({
          ...row,
          sku: buildVariantSku(value, row, attributeTypes),
        }))
      );
    }
  };

  const handleCategoryChange = (event) => {
    setSelectedCategoryIds(
      Array.from(event.target.selectedOptions, (option) => Number(option.value))
    );
  };

  const handleVariantFieldChange = (rowId, field, value) => {
    setVariantRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleVariantAttributeChange = (rowId, attributeId, value) => {
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.rowId === rowId) {
          const updatedRow = {
            ...row,
            attributes: {
              ...row.attributes,
              [attributeId]: value,
            },
          };
          // Auto-update SKU based on attributes
          updatedRow.sku = buildVariantSku(formData.name, updatedRow, attributeTypes);
          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleAddVariantRow = () => {
    const rowId = `variant-new-${Date.now()}`;
    const newRow = {
      rowId,
      variant_id: null,
      sku: buildVariantSku(formData.name, { rowId, attributes: {} }, attributeTypes),
      stock: '',
      price: '',
      discount_price: '',
      image: '',
      imagePreview: '',
      isUploadingImage: false,
      attributes: {},
    };
    setVariantRows((prev) => [...prev, newRow]);
  };

  const handleRemoveVariantRow = (rowId) => {
    setVariantRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const handleVariantImageChange = async (rowId, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setVariantRows((prev) =>
        prev.map((row) =>
          row.rowId === rowId ? { ...row, imagePreview: reader.result } : row
        )
      );
    };
    reader.readAsDataURL(file);

    setVariantRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, isUploadingImage: true } : row
      )
    );
    setError(null);

    try {
      const response = await ProductsService.uploadImage(file);
      const imageUrl = getUploadedImageUrl(response);

      if (!imageUrl) {
        throw new Error('API tải ảnh không trả về URL');
      }

      setVariantRows((prev) =>
        prev.map((row) =>
          row.rowId === rowId
            ? { ...row, image: imageUrl, isUploadingImage: false }
            : row
        )
      );
    } catch (err) {
      console.error('Variant image upload failed:', err);
      setVariantRows((prev) =>
        prev.map((row) =>
          row.rowId === rowId
            ? { ...row, imagePreview: '', isUploadingImage: false }
            : row
        )
      );
      setError('Không thể tải ảnh biến thể. Ảnh hiện tại hoặc ảnh sản phẩm chính sẽ được giữ lại.');
    }
  };

  const handleProductImageChange = async (file) => {
    if (!file) return;

    setIsUploadingProductImage(true);
    setError(null);

    try {
      const response = await ProductsService.uploadImage(file);
      const imageUrl = getUploadedImageUrl(response);

      if (!imageUrl) {
        throw new Error('API tải ảnh không trả về URL');
      }

      setFormData((prev) => ({ ...prev, image: imageUrl }));
    } catch (err) {
      console.error('Product image upload failed:', err);
      setError('Không thể tải ảnh sản phẩm. Ảnh hiện tại vẫn được giữ nguyên.');
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isUploadingProductImage) {
        setError('Vui lòng chờ ảnh sản phẩm tải lên hoàn tất.');
        return;
      }

      if (variantRows.some((row) => row.isUploadingImage)) {
        setError('Vui lòng chờ ảnh biến thể tải lên hoàn tất.');
        return;
      }

      const variants = variantRows
        .map((row) => {
          const attributeValueIds = Object.values(row.attributes).filter(Boolean);
          const isEmpty = !row.sku && row.stock === '' && attributeValueIds.length === 0;
          if (isEmpty) return null;

          return {
            id: row.variant_id || undefined,
            sku: row.sku || undefined,
            stock: row.stock !== '' ? Number(row.stock) : undefined,
            price: row.price !== '' ? Number(row.price) : Number(formData.price),
            discount_price:
              row.discount_price !== ''
                ? Number(row.discount_price)
                : formData.discount_price !== ''
                ? Number(formData.discount_price)
                : null,
            image: row.image || formData.image || null,
            attribute_value_ids: attributeValueIds.map((valueId) => Number(valueId)),
          };
        })
        .filter(Boolean);

      await ProductsService.updateProduct(id, {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        discount_price: formData.discount_price !== '' ? Number(formData.discount_price) : null,
        image: formData.image || null,
        categories: selectedCategoryIds,
        variants,
      });
      notification.success({
        message: 'Cập nhật sản phẩm thành công',
        description: 'Thông tin sản phẩm đã được lưu thành công.',
      });
      navigate(`/admin/products/${id}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Vui lòng thử lại.';
      setError('Cập nhật sản phẩm thất bại. ' + errorMessage);
      notification.error({
        message: 'Lỗi cập nhật sản phẩm',
        description: errorMessage,
      });
      console.error('Product update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-16 min-h-screen bg-surface">
        <div className="max-w-[1280px] mx-auto p-gutter text-center text-on-surface-variant">
          Đang tải dữ liệu chỉnh sửa...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-container-low pt-16">
      <div className="mx-auto max-w-[1200px] space-y-lg p-md md:p-lg">
            <div className="border-b border-outline-variant pb-md">
              <PageHeader
                eyebrow="Quản lý sản phẩm"
                title="Chỉnh sửa sản phẩm"
                subtitle="Cập nhật thông tin chung, giá bán và các biến thể."
                actions={<button
                onClick={() => navigate(`/admin/products/${id}`)}
                className="rounded-lg border border-outline bg-white px-lg py-sm text-on-surface transition hover:bg-surface-container"
              >
                Quay lại chi tiết
                </button>}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-error-container bg-error-container/10 p-md text-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-lg">
              <section className="space-y-lg rounded-xl border border-outline-variant bg-white p-md md:p-lg">
                <div className="border-b border-outline-variant pb-sm">
                  <h2 className="font-label-md text-on-surface">Thông tin sản phẩm</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">Thông tin được hiển thị trong danh sách và trang chi tiết sản phẩm.</p>
                </div>
                <div className="grid gap-xl xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
                  <div className="space-y-lg">
                    <label className="block space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Tên sản phẩm</span>
                      <input
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full rounded-lg border border-outline bg-white px-md py-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Mô tả</span>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="min-h-40 w-full resize-y rounded-lg border border-outline bg-white px-md py-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>

                    <div className="grid gap-md sm:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Giá gốc</span>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleChange('price', e.target.value)}
                          className="w-full rounded-lg border border-outline bg-white px-md py-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          required
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Giá khuyến mãi</span>
                        <input
                          type="number"
                          value={formData.discount_price}
                          onChange={(e) => handleChange('discount_price', e.target.value)}
                          className="w-full rounded-lg border border-outline bg-white px-md py-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-md sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-on-surface-variant">Giá gốc</p>
                        <p className="mt-1 text-sm font-medium text-on-surface">{Number(formData.price || 0).toLocaleString('vi-VN')}₫</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Giá khuyến mãi</p>
                        <p className="mt-1 text-sm font-medium text-on-surface">{formData.discount_price !== '' ? Number(formData.discount_price).toLocaleString('vi-VN') + '₫' : '0₫'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Giá hiện tại</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{getCurrentPrice(formData.price, formData.discount_price).toLocaleString('vi-VN')}₫</p>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-md rounded-xl border border-outline-variant bg-surface-container-low p-md">
                    <div className="overflow-hidden rounded-lg border border-outline-variant bg-white">
                      {formData.image ? (
                        <img
                          src={formData.image}
                          alt="Ảnh sản phẩm hiện tại"
                          className="aspect-[4/3] w-full object-contain"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                      )}
                    </div>

                    <Upload
                      accept="image/*"
                      multiple={false}
                      showUploadList={false}
                      disabled={isUploadingProductImage || saving}
                      className="block w-full"
                      beforeUpload={(file) => {
                        handleProductImageChange(file);
                        return Upload.LIST_IGNORE;
                      }}
                    >
                      <Button
                        block
                        icon={<UploadOutlined />}
                        disabled={isUploadingProductImage || saving}
                        className="!h-10 !rounded-lg !border-outline-variant !bg-white !text-on-surface !shadow-none"
                      >
                        {isUploadingProductImage ? 'Đang tải ảnh...' : 'Thay ảnh sản phẩm'}
                      </Button>
                    </Upload>

                    <label className="block space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">URL hình ảnh</span>
                      <input
                        value={formData.image}
                        onChange={(e) => handleChange('image', e.target.value)}
                        className="w-full rounded-lg border border-outline bg-white px-md py-sm text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="https://..."
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Danh mục</span>
                      <select
                        multiple
                        value={selectedCategoryIds.map(String)}
                        onChange={handleCategoryChange}
                        className="min-h-32 w-full rounded-lg border border-outline bg-white px-sm py-2 text-on-surface outline-none focus:border-primary"
                      >
                        {categories.map((category) => (
                          <option key={category.id ?? category._id ?? category.category_id} value={category.id ?? category._id ?? category.category_id}>
                            {category.name ?? category.title ?? 'Danh mục'}
                          </option>
                        ))}
                      </select>
                      <span className="block text-xs leading-5 text-on-surface-variant">
                        Giữ Ctrl (Windows) hoặc Command (macOS) để chọn nhiều danh mục.
                      </span>
                    </label>
                  </aside>
                </div>
              </section>

              <section className="space-y-lg rounded-xl border border-outline-variant bg-white p-md md:p-lg">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-title-sm text-title-sm text-on-background">Biến thể sản phẩm</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Chỉnh sửa tồn kho và giá trị thuộc tính cho từng biến thể.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-md py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Thêm biến thể
                  </button>
                </div>

                <div className="space-y-md">
                  {variantRows.map((row, rowIndex) => (
                    <div key={row.rowId} className="grid gap-lg rounded-xl border border-outline-variant bg-surface-container-low p-md md:p-lg">
                      <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-sm">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Biến thể {rowIndex + 1}</p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">{row.sku || 'SKU sẽ được tạo tự động'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(row.rowId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-error/50 bg-white px-sm py-1.5 text-sm text-error transition hover:bg-error-container/20"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                          Xóa
                        </button>
                      </div>
                      <div className="grid gap-lg lg:grid-cols-3 items-end">
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Tồn kho</span>
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'stock', e.target.value)}
                            className="w-full rounded-xl border border-outline bg-white px-md py-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Giá biến thể</span>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'price', e.target.value)}
                            placeholder="Để trống dùng giá gốc"
                            className="w-full rounded-xl border border-outline bg-white px-md py-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Giá khuyến mãi biến thể</span>
                          <input
                            type="number"
                            value={row.discount_price}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'discount_price', e.target.value)}
                            placeholder="Để trống dùng giá khuyến mãi chung"
                            className="w-full rounded-xl border border-outline bg-white px-md py-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                      </div>
                      <div className="space-y-2">
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Ảnh biến thể (tùy chọn)
                        </p>
                        <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-white p-3 sm:flex-row sm:items-center">
                          {(row.imagePreview || row.image || formData.image) ? (
                            <img
                              src={row.imagePreview || row.image || formData.image}
                              alt={`Ảnh của biến thể ${row.sku || row.rowId}`}
                              className="h-16 w-16 shrink-0 rounded-lg border border-outline-variant object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-on-surface-variant">
                              <span className="material-symbols-outlined">image</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-on-surface">
                              {row.isUploadingImage
                                ? 'Đang tải ảnh...'
                                : row.image
                                  ? 'Ảnh riêng của biến thể'
                                  : formData.image
                                    ? 'Đang dùng ảnh sản phẩm chính'
                                    : 'Chưa có ảnh'}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">JPG, PNG hoặc WebP, tối đa 2 MB.</p>
                          </div>
                          <Upload
                            accept="image/*"
                            multiple={false}
                            showUploadList={false}
                            disabled={row.isUploadingImage || saving}
                            beforeUpload={(file) => {
                              handleVariantImageChange(row.rowId, file);
                              return Upload.LIST_IGNORE;
                            }}
                          >
                            <Button
                              icon={<UploadOutlined />}
                              disabled={row.isUploadingImage || saving}
                              className="!h-9 !rounded-lg !border-outline-variant !bg-surface-container !px-3 !text-on-surface !shadow-none"
                            >
                              {row.image || row.imagePreview ? 'Thay ảnh' : 'Chọn ảnh'}
                            </Button>
                          </Upload>
                        </div>
                      </div>
                      <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
                          {attributeTypes.map((attrType) => (
                            <label key={attrType.id} className="space-y-2">
                              <span className="font-label-sm text-label-sm text-on-surface-variant">{attrType.name}</span>
                              <select
                                value={row.attributes?.[String(attrType.id)] ?? ''}
                                onChange={(e) => handleVariantAttributeChange(row.rowId, String(attrType.id), String(e.target.value))}
                                className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                              >
                                <option value="">Chọn giá trị</option>
                                {attrType.attributeValues.map((option) => {
                                  const optionValue = String(
                                    option.id ??
                                    option._id ??
                                    option.attribute_value_id ??
                                    option.value ??
                                    option.value_id ??
                                    option.code ??
                                    option.key ??
                                    ''
                                  );
                                  const optionLabel =
                                    option.value ?? option.name ?? option.title ?? option.label ?? option.display_value ?? 'Giá trị';
                                  return (
                                    <option key={`${String(attrType.id)}-${optionValue}`} value={optionValue}>
                                      {optionLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-outline-variant bg-white p-md">
                <button
                  type="submit"
                  disabled={saving || isUploadingProductImage || variantRows.some((row) => row.isUploadingImage)}
                  className="order-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary transition hover:bg-primary-container disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/products/${id}`)}
                  className="order-1 rounded-lg border border-outline bg-white px-lg py-sm text-on-surface transition hover:bg-surface-container"
                >
                  Quay lại
                </button>
              </div>
            </form>
      </div>
    </main>
  );
};

export default AdminProductEditPage;
