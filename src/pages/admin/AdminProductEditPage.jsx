import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notification } from 'antd';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import AttributeService from '../../services/AttributeService';
import ProductsService from '../../services/ProductsService';

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
  const discountAmount = Number(discount || 0);
  return Math.max(basePrice - discountAmount, 0);
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
  const [activeMenu, setActiveMenu] = useState('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [status, setStatus] = useState('active');
  const [variantRows, setVariantRows] = useState([
    {
      rowId: 'variant-1',
      variant_id: null,
      sku: '',
      stock: '',
      price: '',
      discount_price: '',
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

        const categoryId = Array.isArray(productData?.categories) && productData.categories.length > 0
          ? productData.categories[0]?.id ?? productData.categories[0]?._id ?? productData.categories[0]?.categoryId ?? ''
          : productData?.category?.id ?? productData?.category?._id ?? productData?.category?.categoryId ?? '';
        setSelectedCategoryId(categoryId ? String(categoryId) : '');
        setStatus(productData?.status || 'active');

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
    setSelectedCategoryId(event.target.value);
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
      attributes: {},
    };
    setVariantRows((prev) => [...prev, newRow]);
  };

  const handleRemoveVariantRow = (rowId) => {
    setVariantRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
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
        status,
        categories: selectedCategoryId ? [Number(selectedCategoryId)] : [],
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
      <div className="flex">
        <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <div className="flex-1 ml-64">
          <AdminHeader />
          <main className="pt-16 min-h-screen bg-surface">
            <div className="max-w-[1280px] mx-auto p-gutter text-center text-on-surface-variant">
              Đang tải dữ liệu chỉnh sửa...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="pt-16 min-h-screen bg-surface">
          <div className="max-w-[1280px] mx-auto p-gutter space-y-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
              <div>
                <h1 className="font-headline-md text-headline-md text-on-background">Chỉnh sửa sản phẩm</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Cập nhật tên, mô tả, giá và hình ảnh sản phẩm.</p>
              </div>
              <button
                onClick={() => navigate(`/admin/products/${id}`)}
                className="rounded-lg px-lg py-sm bg-surface text-on-surface border border-outline hover:bg-surface-container transition"
              >
                Hủy
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-error-container bg-error-container/10 p-md text-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-lg rounded-3xl bg-surface-container-lowest border border-outline-variant p-lg">
              <div className="grid gap-lg lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Tên sản phẩm</span>
                  <input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Hình ảnh (URL)</span>
                  <input
                    value={formData.image}
                    onChange={(e) => handleChange('image', e.target.value)}
                    className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Mô tả</span>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full min-h-35 rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                />
              </label>

              <div className="grid gap-lg sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Giá gốc</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Giảm giá</span>
                  <input
                    type="number"
                    value={formData.discount_price}
                    onChange={(e) => handleChange('discount_price', e.target.value)}
                    className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-outline p-md bg-surface-container-lowest">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="font-label-xs text-xs text-on-surface-variant">Giá gốc</p>
                    <p className="font-body-sm text-body-sm text-on-surface">{Number(formData.price || 0).toLocaleString('vi-VN')}₫</p>
                  </div>
                  <div>
                    <p className="font-label-xs text-xs text-on-surface-variant">Giảm giá</p>
                    <p className="font-body-sm text-body-sm text-on-surface">{formData.discount_price !== '' ? Number(formData.discount_price).toLocaleString('vi-VN') + '₫' : '0₫'}</p>
                  </div>
                  <div>
                    <p className="font-label-xs text-xs text-on-surface-variant">Giá hiện tại</p>
                    <p className="font-body-sm text-body-sm text-on-surface font-semibold">{getCurrentPrice(formData.price, formData.discount_price).toLocaleString('vi-VN')}₫</p>
                  </div>
                </div>
                {/* {getDiscountAmount(formData.price, formData.discount_price) > 0 && (
                  // <p className="mt-3 text-sm text-error">Tiết kiệm {getDiscountAmount(formData.price, formData.discount_price).toLocaleString('vi-VN')}₫</p>
                )} */}
              </div>

              <div className="grid gap-lg">
                <label className="space-y-2">
                  <span className="font-label-md text-label-sm text-on-surface-variant">Danh mục</span>
                  <select
                    value={selectedCategoryId}
                    onChange={handleCategoryChange}
                    className="w-full rounded-xl border border-outline px-md py-sm bg-surface text-on-surface"
                    required
                  >
                    <option value="" disabled>
                      Chọn danh mục
                    </option>
                    {categories.map((category) => (
                      <option key={category.id ?? category._id ?? category.category_id} value={category.id ?? category._id ?? category.category_id}>
                        {category.name ?? category.title ?? 'Danh mục'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-lg rounded-2xl border border-outline p-lg bg-surface">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-title-sm text-title-sm text-on-background">Biến thể sản phẩm</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Chỉnh sửa tồn kho và giá trị thuộc tính cho từng biến thể.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="rounded-lg bg-secondary px-md py-2 text-on-secondary hover:bg-secondary-container transition"
                  >
                    Thêm biến thể
                  </button>
                </div>

                <div className="space-y-md">
                  {variantRows.map((row) => (
                    <div key={row.rowId} className="grid gap-lg rounded-2xl border border-outline p-lg bg-surface-container">
                      <div className="grid gap-lg lg:grid-cols-3 items-end">
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Tồn kho</span>
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'stock', e.target.value)}
                            className="w-full rounded-3xl border border-outline px-md py-sm bg-surface text-on-surface"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Giá biến thể</span>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'price', e.target.value)}
                            placeholder="Để trống dùng giá gốc"
                            className="w-full rounded-3xl border border-outline px-md py-sm bg-surface text-on-surface"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Giảm giá biến thể</span>
                          <input
                            type="number"
                            value={row.discount_price}
                            onChange={(e) => handleVariantFieldChange(row.rowId, 'discount_price', e.target.value)}
                            placeholder="Để trống dùng giảm giá chung"
                            className="w-full rounded-3xl border border-outline px-md py-sm bg-surface text-on-surface"
                          />
                        </label>
                      </div>
                      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_auto] items-end">
                        <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-2">
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
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(row.rowId)}
                            className="rounded-lg bg-error px-md py-2 text-on-error hover:bg-error-container transition"
                          >
                            Xóa biến thể
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-lg py-sm text-on-primary hover:bg-primary-container transition disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/products/${id}`)}
                  className="rounded-lg bg-surface px-lg py-sm text-on-surface border border-outline hover:bg-surface-container transition"
                >
                  Quay lại
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminProductEditPage;
