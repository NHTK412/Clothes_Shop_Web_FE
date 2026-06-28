import { useEffect, useRef, useState } from 'react';
import { notification } from 'antd';
import AttributeService from '../../services/AttributeService';
import ProductsService from '../../services/ProductsService';

const AddProductModal = ({ isOpen, onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    image: null,
    attribute_value_ids: [],
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [variantDraft, setVariantDraft] = useState({
    attributes: {},
    stock: '',
    price: '',
    discount_price: '',
  });
  const nextVariantId = useRef(1);
  const [variantRows, setVariantRows] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadAttributes = async () => {
      setIsLoadingAttributes(true);
      try {
        const response = await AttributeService.getAllAttributes();
        const payload = response?.data?.data ?? response?.data ?? response;
        const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : [];
        const normalized = (Array.isArray(data) ? data : []).map((type) => ({
          id: type.id ?? type.attribute_id ?? type._id,
          name: type.name ?? type.title ?? 'Thuộc tính',
          attributeValues: Array.isArray(type.attributeValues) ? type.attributeValues : Array.isArray(type.attribute_values) ? type.attribute_values : Array.isArray(type.values) ? type.values : [],
        }));
        setAttributeTypes(normalized);
      } catch (err) {
        console.error('Failed to load attributes', err);
        setAttributeTypes([]);
      } finally {
        setIsLoadingAttributes(false);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await ProductsService.getCategories();
        const list = Array.isArray(response) ? response : [];
        setCategories(list);
      } catch (err) {
        console.error('Failed to load categories', err);
        setCategories([]);
      }
    };

    loadAttributes();
    loadCategories();
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // When product name changes, regenerate SKUs for all variants
    if (name === 'name') {
      setVariantRows((prev) =>
        prev.map((row) => ({
          ...row,
          sku: buildVariantSku(value, row),
        }))
      );
    }
  };

  const handleVariantRowChange = (rowId, field, value) => {
    setVariantRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleVariantDraftAttributeChange = (attributeId, value) => {
    setVariantDraft((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeId]: value,
      },
    }));
  };

  const handleVariantAttributeChange = (rowId, attributeId, value) => {
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedRow = {
            ...row,
            attributes: { ...row.attributes, [attributeId]: value },
          };
          // Auto-update SKU based on attributes
          updatedRow.sku = buildVariantSku(formData.name, updatedRow);
          return updatedRow;
        }
        return row;
      })
    );
  };

  const addVariantRow = () => {
    const stockValue = variantDraft.stock === '' ? '' : Number(variantDraft.stock);
    const hasAttributeSelection = Object.values(variantDraft.attributes).some(Boolean);
    const priceValue = variantDraft.price === '' ? '' : Number(variantDraft.price);

    if (
      !hasAttributeSelection ||
      stockValue === '' ||
      Number.isNaN(stockValue) ||
      stockValue < 0 ||
      (variantDraft.price !== '' && (Number.isNaN(priceValue) || priceValue < 0))
    ) {
      setError('Vui lòng chọn thuộc tính và nhập số lượng cho biến thể. Giá biến thể có thể để trống để dùng giá sản phẩm chung.');
      return;
    }

    const id = nextVariantId.current++;
    const newRow = {
      id,
      attributes: { ...variantDraft.attributes },
      stock: String(stockValue),
      price: variantDraft.price,
      discount_price: variantDraft.discount_price,
      sku: buildVariantSku(formData.name, { attributes: { ...variantDraft.attributes } }),
    };

    setVariantRows((prev) => [...prev, newRow]);
    setVariantDraft({ attributes: {}, stock: '', price: '', discount_price: '' });
    setError(null);
  };

  const removeVariantRow = (rowId) => {
    setVariantRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const buildVariantSku = (productName, row) => {
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
    return base ? `${base}-${row.id}` : `VARIANT-${row.id}`;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload image
      setIsLoading(true);
      setError(null);
      try {
        const response = await ProductsService.uploadImage(file);
        if (response.success) {
          setUploadedImageUrl(response.data.image_url);
          setFormData((prev) => ({
            ...prev,
            image: response.data.image_url,
          }));
          setSuccessMessage('Ảnh được tải lên thành công!');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } catch (err) {
        const status = err.response?.status;
        const msg =
          status === 401
            ? 'Unauthenticated.'
            : err.response?.data?.message || err.message || 'Vui lòng thử lại';
        setError(`Lỗi tải ảnh: ${msg}. Bạn có thể tiếp tục tạo sản phẩm mà không cần upload ảnh, hoặc nhập URL ảnh trực tiếp.`);
        setUploadedImageUrl(null);
        setFormData((prev) => ({
          ...prev,
          image: null,
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImageUrlChange = (e) => {
    const imageUrl = e.target.value;
    setFormData((prev) => ({
      ...prev,
      image: imageUrl,
    }));
    setUploadedImageUrl(null);
    setImagePreview(imageUrl);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategoryId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      setError('Vui lòng điền tên sản phẩm và giá');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const variants = variantRows
        .map((row) => {
          const attributeValueIds = Object.values(row.attributes).filter(Boolean);
          if (attributeValueIds.length === 0 && row.stock === '') {
            return null;
          }
          return {
            sku: buildVariantSku(formData.name, row),
            stock: row.stock ? parseInt(row.stock, 10) : 0,
            price: row.price !== '' ? Number(row.price) : Number(formData.price),
            discount_price: row.discount_price !== ''
              ? Number(row.discount_price)
              : (formData.discount_price ? Number(formData.discount_price) : null),
            attribute_value_ids: attributeValueIds,
          };
        })
        .filter(Boolean);

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        categories: selectedCategoryId ? [Number(selectedCategoryId)] : null,
        variants: variants.length > 0 ? variants : null,
      };

      const rawImageValue = uploadedImageUrl || formData.image;
      const imageValue = rawImageValue && !String(rawImageValue).startsWith('data:') ? rawImageValue : null;
      if (imageValue) {
        productData.image = imageValue;
      }

      console.log("[AddProductModal] Creating product with data:", productData);

      const response = await ProductsService.createProduct(productData);

      if (response.success || response.status === 201) {
        notification.success({
          message: 'Tạo sản phẩm thành công',
          description: 'Sản phẩm mới đã được tạo thành công.',
        });
        setSuccessMessage('Sản phẩm được tạo thành công!');
        resetForm();
        onProductAdded(response.data);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating product:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Lỗi tạo sản phẩm';
      notification.error({
        message: 'Lỗi tạo sản phẩm',
        description: `${errorMsg}. Vui lòng đảm bảo bạn đã đăng nhập với tài khoản admin.`,
      });
      setError(`${errorMsg}. Vui lòng đảm bảo bạn đã đăng nhập với tài khoản admin.`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_price: '',
      image: null,
      attribute_value_ids: [],
    });
    setImagePreview(null);
    setUploadedImageUrl(null);
    setError(null);
    setSuccessMessage(null);
    setSelectedCategoryId('');
    setVariantDraft({ attributes: {}, stock: '', price: '', discount_price: '' });
    nextVariantId.current = 1;
    setVariantRows([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-low border-b border-outline-variant p-md flex justify-between items-center z-10">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Thêm Sản Phẩm Mới</h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-md space-y-md">
          {/* Alert Messages */}
          {error && (
            <div className="p-sm bg-error-container text-on-error-container rounded-lg text-body-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-sm bg-primary-fixed text-on-primary-fixed-variant rounded-lg text-body-sm">
              {successMessage}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-sm">
            <label className="font-label-md text-label-md text-on-surface">
              Ảnh Sản Phẩm
            </label>
            <div className="relative border-2 border-dashed border-outline-variant rounded-lg p-md text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isLoading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {imagePreview ? (
                <div className="space-y-sm">
                  <img
                    src={imagePreview}
                    alt="Xem trước sản phẩm"
                    className="w-24 h-24 mx-auto object-cover rounded"
                  />
                  <p className="text-label-sm text-on-surface-variant">
                    {uploadedImageUrl ? '✓ Ảnh đã tải lên' : isLoading ? 'Đang tải...' : 'Ảnh chưa được tải lên'}
                  </p>
                </div>
              ) : (
                <div className="space-y-xs py-md">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl block">
                    cloud_upload
                  </span>
                  <p className="text-label-md text-on-surface">Chọn ảnh hoặc kéo thả</p>
                  <p className="text-label-sm text-on-surface-variant">JPG, PNG hoặc WebP. Tối đa 2 MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-sm">
            <label className="font-label-md text-label-md text-on-surface">
              URL Ảnh Sản Phẩm (tùy chọn)
            </label>
            <input
              type="url"
              name="image"
              value={formData.image ?? ''}
              onChange={handleImageUrlChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
            />
            <p className="text-label-sm text-on-surface-variant">
              Nếu upload ảnh không thành công, có thể nhập URL ảnh trực tiếp.
            </p>
          </div>

          {/* Product Name */}
          <div className="space-y-sm">
            <label className="font-label-md text-label-md text-on-surface">
              Tên Sản Phẩm *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Nhập tên sản phẩm"
              className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-sm">
            <label className="font-label-md text-label-md text-on-surface">
              Mô Tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Nhập mô tả sản phẩm"
              rows="3"
              className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm resize-none"
            />
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <label className="font-label-md text-label-md text-on-surface">
                Giá Gốc *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
              />
            </div>
            <div className="space-y-sm">
              <label className="font-label-md text-label-md text-on-surface">
                Giảm giá
              </label>
              <input
                type="number"
                name="discount_price"
                value={formData.discount_price}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
              />
            </div>
          </div>

          <div className="space-y-sm">
            <label className="font-label-md text-label-md text-on-surface">Danh mục</label>
            <select
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((category) => {
                const categoryId = category.id ?? category._id ?? category.categoryId ?? category.id;
                const categoryLabel = category.name ?? category.title ?? category.slug ?? `#${categoryId}`;
                return (
                  <option key={categoryId} value={categoryId}>
                    {categoryLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="border border-outline-variant rounded-xl p-md space-y-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-headline-sm text-on-surface">Biến thể sản phẩm</h2>
                <p className="text-sm text-on-surface-variant">
                  Chọn thuộc tính như size, màu rồi nhập số lượng. Bấm dấu cộng để tạo biến thể mới.
                </p>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-md py-2 text-on-primary hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined">add</span>
                Thêm biến thể
              </button>
            </div>

            <div className="rounded-2xl border border-dashed border-outline-variant p-md space-y-md bg-surface-container-low">
              <div className="flex items-center justify-between gap-3">
                <p className="font-label-md text-on-surface">Biến thể mới</p>
                <span className="text-sm text-on-surface-variant">Chọn một lần rồi thêm</span>
              </div>
              <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
                {isLoadingAttributes ? (
                  <p className="text-sm text-on-surface-variant md:col-span-2 xl:col-span-3">Đang tải thuộc tính...</p>
                ) : attributeTypes.length === 0 ? (
                  <p className="text-sm text-on-surface-variant md:col-span-2 xl:col-span-3">Hiện chưa có thuộc tính nào trong hệ thống.</p>
                ) : (
                  attributeTypes.map((type) => (
                    <label key={type.id} className="space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{type.name}</span>
                      <select
                        value={variantDraft.attributes[type.id] || ''}
                        onChange={(e) => handleVariantDraftAttributeChange(type.id, e.target.value)}
                        className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                      >
                        <option value="">-- Chọn {type.name} --</option>
                        {(type.attributeValues || []).map((value) => {
                          const optionValue = value.id ?? value.attribute_value_id ?? value.value;
                          const optionLabel = value.value ?? value.name ?? value.label;
                          return (
                            <option key={optionValue} value={optionValue}>
                              {optionLabel}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ))
                )}
                <label className="space-y-2 md:col-span-2 xl:col-span-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Số lượng</span>
                  <input
                    type="number"
                    min="0"
                    value={variantDraft.stock}
                    onChange={(e) => setVariantDraft((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                  />
                </label>
                <label className="space-y-2 xl:col-span-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Giá gốc</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantDraft.price}
                    onChange={(e) => setVariantDraft((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                    className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                  />
                </label>
                <label className="space-y-2 xl:col-span-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Giảm giá</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantDraft.discount_price}
                    onChange={(e) => setVariantDraft((prev) => ({ ...prev, discount_price: e.target.value }))}
                    placeholder="0"
                    className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                  />
                </label>
              </div>
            </div>

            {variantRows.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có biến thể nào. Chọn thuộc tính và số lượng rồi bấm dấu cộng để tạo biến thể đầu tiên.</p>
            ) : (
              variantRows.map((row, rowIndex) => (
                <div key={row.id} className="rounded-2xl border border-outline-variant p-md space-y-md bg-surface-container">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-label-md text-on-surface">Biến thể {rowIndex + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeVariantRow(row.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-error px-sm py-1 text-error hover:bg-error-container/10 transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                      Xóa
                    </button>
                  </div>
                  <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
                    {attributeTypes.map((type) => {
                      const selectedValue = row.attributes[type.id] || '';
                      return (
                        <label key={`${row.id}-${type.id}`} className="space-y-2">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{type.name}</span>
                          <select
                            value={selectedValue}
                            onChange={(e) => handleVariantAttributeChange(row.id, type.id, e.target.value)}
                            className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                          >
                            <option value="">-- Chọn {type.name} --</option>
                            {(type.attributeValues || []).map((value) => {
                              const optionValue = value.id ?? value.attribute_value_id ?? value.value;
                              const optionLabel = value.value ?? value.name ?? value.label;
                              return (
                                <option key={`${row.id}-${optionValue}`} value={optionValue}>
                                  {optionLabel}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      );
                    })}
                    <label className="space-y-2 md:col-span-2 xl:col-span-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Số lượng</span>
                      <input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => handleVariantRowChange(row.id, 'stock', e.target.value)}
                        placeholder="0"
                        className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Giá gốc</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price || ''}
                        onChange={(e) => handleVariantRowChange(row.id, 'price', e.target.value)}
                        placeholder="0"
                        className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Giảm giá</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.discount_price || ''}
                        onChange={(e) => handleVariantRowChange(row.id, 'discount_price', e.target.value)}
                        placeholder="0"
                        className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-sm justify-end pt-md border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-all disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all disabled:opacity-50 font-label-md"
            >
              {isLoading ? 'Đang xử lý...' : 'Tạo Sản Phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
