import { useEffect, useRef, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, notification, Upload } from 'antd';
import AttributeService from '../../services/AttributeService';
import ProductsService from '../../services/ProductsService';

const getUploadedImageUrl = (response) =>
  response?.data?.image_url ??
  response?.data?.url ??
  response?.image_url ??
  response?.url ??
  null;

const AddProductModal = ({ isOpen, onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
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
      image: '',
      imagePreview: '',
      isUploadingImage: false,
      sku: buildVariantSku(formData.name, { id, attributes: { ...variantDraft.attributes } }),
    };

    setVariantRows((prev) => [...prev, newRow]);
    setVariantDraft({ attributes: {}, stock: '', price: '', discount_price: '' });
    setError(null);
  };

  const removeVariantRow = (rowId) => {
    setVariantRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleVariantImageChange = async (rowId, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setVariantRows((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, imagePreview: reader.result } : row
        )
      );
    };
    reader.readAsDataURL(file);

    setVariantRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, isUploadingImage: true } : row
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
          row.id === rowId
            ? { ...row, image: imageUrl, isUploadingImage: false }
            : row
        )
      );
    } catch (err) {
      console.error('Error uploading variant image:', err);
      setVariantRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, image: '', imagePreview: '', isUploadingImage: false }
            : row
        )
      );
      setError('Không thể tải ảnh biến thể. Biến thể này sẽ sử dụng ảnh sản phẩm chính.');
    }
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

  const handleImageChange = async (fileOrEvent) => {
    const file = fileOrEvent?.target?.files?.[0] ?? fileOrEvent;
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
        const imageUrl = getUploadedImageUrl(response);
        if (imageUrl) {
          setUploadedImageUrl(imageUrl);
          setFormData((prev) => ({
            ...prev,
            image: imageUrl,
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
    setSelectedCategoryIds(
      Array.from(e.target.selectedOptions, (option) => Number(option.value))
    );
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
      if (variantRows.some((row) => row.isUploadingImage)) {
        setError('Vui lòng chờ ảnh biến thể tải lên hoàn tất.');
        return;
      }

      const rawImageValue = uploadedImageUrl || formData.image;
      const imageValue = rawImageValue && !String(rawImageValue).startsWith('data:')
        ? rawImageValue
        : null;

      const variants = variantRows
        .map((row) => {
          const attributeValueIds = Object.values(row.attributes)
            .filter(Boolean)
            .map(Number);
          if (attributeValueIds.length === 0 && row.stock === '') {
            return null;
          }
          return {
            sku: buildVariantSku(formData.name, row),
            price: row.price !== '' ? Number(row.price) : Number(formData.price),
            discount_price: row.discount_price !== ''
              ? Number(row.discount_price)
              : (formData.discount_price ? Number(formData.discount_price) : null),
            stock: row.stock ? parseInt(row.stock, 10) : 0,
            image: row.image || imageValue,
            attribute_value_ids: attributeValueIds,
          };
        })
        .filter(Boolean);

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        image: imageValue,
        categories: selectedCategoryIds,
        variants,
      };

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
    });
    setImagePreview(null);
    setUploadedImageUrl(null);
    setError(null);
    setSuccessMessage(null);
    setSelectedCategoryIds([]);
    setVariantDraft({ attributes: {}, stock: '', price: '', discount_price: '' });
    nextVariantId.current = 1;
    setVariantRows([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] md:p-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-low shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant bg-white px-lg py-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Thêm sản phẩm mới</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Nhập thông tin chung, danh mục và các biến thể của sản phẩm.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-lg p-md md:p-lg">
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

          <section className="grid gap-lg rounded-xl border border-outline-variant bg-white p-md md:grid-cols-2 md:p-lg">
            <div className="border-b border-outline-variant pb-sm md:col-span-2">
              <h4 className="font-label-md text-on-surface">Thông tin sản phẩm</h4>
              <p className="mt-1 text-sm text-on-surface-variant">Các thông tin cơ bản được hiển thị trên cửa hàng.</p>
            </div>

          {/* Image Upload */}
          <div className="space-y-sm md:col-span-2">
            <label className="font-label-md text-label-md text-on-surface">
              Ảnh Sản Phẩm
            </label>
            <Upload.Dragger
                name="image"
                accept="image/*"
                multiple={false}
                showUploadList={false}
                disabled={isLoading}
                beforeUpload={(file) => {
                  handleImageChange(file);
                  return Upload.LIST_IGNORE;
                }}
                className="[&_.ant-upload-drag]:!rounded-xl [&_.ant-upload-drag]:!border-outline [&_.ant-upload-drag]:!bg-surface-container-low [&_.ant-upload-drag]:!p-lg hover:[&_.ant-upload-drag]:!border-primary"
              >
              {imagePreview ? (
                <div className="space-y-sm">
                  <img
                    src={imagePreview}
                    alt="Xem trước sản phẩm"
                    className="mx-auto h-32 w-32 rounded-lg border border-outline-variant object-cover"
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
            </Upload.Dragger>
          </div>

          <div className="space-y-sm md:col-span-2">
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
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 md:col-span-2">
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
                Giá khuyến mãi
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

          <div className="space-y-sm md:col-span-2">
            <label className="font-label-md text-label-md text-on-surface">Danh mục</label>
            <select
              multiple
              value={selectedCategoryIds.map(String)}
              onChange={handleCategoryChange}
              className="w-full min-h-28 px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
            >
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
            <p className="text-label-sm text-on-surface-variant">
              Giữ Ctrl (Windows) hoặc Command (macOS) để chọn nhiều danh mục.
            </p>
          </div>
          </section>

          <section className="space-y-md rounded-xl border border-outline-variant bg-white p-md md:p-lg">
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

            <div className="space-y-md rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-md">
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
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Giá khuyến mãi</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantDraft.discount_price}
                    onChange={(e) => setVariantDraft((prev) => ({ ...prev, discount_price: e.target.value }))}
                    placeholder="Để trống dùng giá khuyến mãi chung"
                    className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                  />
                </label>
              </div>
            </div>

            {variantRows.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có biến thể nào. Chọn thuộc tính và số lượng rồi bấm dấu cộng để tạo biến thể đầu tiên.</p>
            ) : (
              variantRows.map((row, rowIndex) => (
                <div key={row.id} className="space-y-md rounded-xl border border-outline-variant bg-white p-md shadow-sm">
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
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Giá khuyến mãi</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.discount_price || ''}
                        onChange={(e) => handleVariantRowChange(row.id, 'discount_price', e.target.value)}
                        placeholder="Để trống dùng giá khuyến mãi chung"
                        className="w-full px-sm py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-body-sm"
                      />
                    </label>
                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        Ảnh biến thể (tùy chọn)
                      </p>
                      <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center">
                        {(row.imagePreview || row.image || imagePreview) ? (
                          <img
                            src={row.imagePreview || row.image || imagePreview}
                            alt={`Xem trước ảnh biến thể ${rowIndex + 1}`}
                            className="h-16 w-16 shrink-0 rounded-md border border-outline-variant object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-white text-on-surface-variant">
                            <span className="material-symbols-outlined">image</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface">
                            {row.isUploadingImage
                              ? 'Đang tải ảnh...'
                              : row.image
                                ? 'Ảnh riêng của biến thể'
                                : imagePreview
                                  ? 'Đang dùng ảnh sản phẩm chính'
                                  : 'Chưa có ảnh'}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">JPG, PNG hoặc WebP, tối đa 2 MB.</p>
                        </div>
                        <Upload
                          accept="image/*"
                          multiple={false}
                          showUploadList={false}
                          disabled={row.isUploadingImage || isLoading}
                          beforeUpload={(file) => {
                            handleVariantImageChange(row.id, file);
                            return Upload.LIST_IGNORE;
                          }}
                        >
                          <Button
                            icon={<UploadOutlined />}
                            disabled={row.isUploadingImage || isLoading}
                            className="!h-9 !rounded-lg !border-outline-variant !bg-white !px-3 !text-on-surface !shadow-none"
                          >
                            {row.image || row.imagePreview ? 'Thay ảnh' : 'Chọn ảnh'}
                          </Button>
                        </Upload>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Action Buttons */}
          <div className="sticky bottom-0 z-10 -mx-md -mb-md flex justify-end gap-sm border-t border-outline-variant bg-white px-md py-md md:-mx-lg md:-mb-lg md:px-lg">
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
