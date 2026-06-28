/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { notification } from "antd";
import Cookies from "js-cookie";
import productsService from "../../services/ProductsService";
import CartService from "../../services/CartService";
import ProfileService from "../../services/ProfileService";

const getVariantAttributeValues = (variant) => {
  const values = variant?.attribute_values ?? variant?.attributeValues ?? variant?.attributes ?? [];
  return Array.isArray(values) ? values : [];
};

const getAttributeTypeKey = (attribute) => String(
  attribute?.attribute_type_id ??
  attribute?.attributeTypeId ??
  attribute?.attribute_type?.id ??
  attribute?.attributeType?.id ??
  attribute?.type_id ??
  attribute?.typeId ??
  attribute?.attribute_type?.name ??
  attribute?.attributeType?.name ??
  'attribute'
);

const getAttributeValueKey = (attribute) => String(
  attribute?.id ??
  attribute?.attribute_value_id ??
  attribute?.value_id ??
  attribute?.value ??
  attribute?.display_value ??
  ''
);

const getAttributeDisplay = (attribute) =>
  attribute?.display_value ??
  attribute?.displayValue ??
  attribute?.display_name ??
  attribute?.label ??
  attribute?.name ??
  attribute?.value ??
  '';

const getAttributeMeta = (attribute) => {
  try {
    return typeof attribute?.meta_data === 'string'
      ? JSON.parse(attribute.meta_data || '{}')
      : (attribute?.meta_data ?? attribute?.metadata ?? {});
  } catch {
    return {};
  }
};

const getAttributeKind = (attribute) => {
  const raw = String(getAttributeDisplay(attribute)).toLowerCase().trim();
  const meta = getAttributeMeta(attribute);
  const explicitName = String(
    attribute?.attribute_type?.name ??
    attribute?.attributeType?.name ??
    attribute?.type_name ??
    ''
  ).toLowerCase();

  if (meta.hex || meta.color || /màu|color|colour/.test(explicitName)) return 'color';
  if (/kích|size/.test(explicitName) || /^(xs|s|m|l|xl|xxl|xxxl|small|medium|large)$/i.test(raw)) return 'size';
  if (/chất liệu|material|fabric/.test(explicitName) || /(cotton|polyester|linen|silk|wool|denim|nylon|spandex)/i.test(raw)) return 'material';
  return 'default';
};

const getAttributeTypeLabel = (attribute, typeKey) => {
  const explicitName =
    attribute?.attribute_type?.display_name ??
    attribute?.attribute_type?.name ??
    attribute?.attributeType?.display_name ??
    attribute?.attributeType?.name ??
    attribute?.type_name;

  if (explicitName) return explicitName;

  const kind = getAttributeKind(attribute);
  if (kind === 'color') return 'Màu sắc';
  if (kind === 'size') return 'Kích cỡ';
  if (kind === 'material') return 'Chất liệu';
  return `Thuộc tính ${typeKey}`;
};

const getVariantAttributeSelection = (variant) =>
  getVariantAttributeValues(variant).reduce((selection, attribute) => {
    selection[getAttributeTypeKey(attribute)] = getAttributeValueKey(attribute);
    return selection;
  }, {});

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);
  const productSectionRef = useRef(null);

  const handleBlankClick = (e) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setSelectedVariant(null);
      setSelectedAttributes({});
      try {
        const p = await productsService.getProduct(id);
        if (!mounted) return;
        let nextProduct = p;
        if (Cookies.get("access_token") && p?.id) {
          try {
            const profile = await ProfileService.getProfile();
            const favorites = await productsService.getUserFavorites(profile?.id);
            const favoriteIds = productsService.getFavoriteProductIds(favorites);
            nextProduct = {
              ...p,
              isFavorite: favoriteIds.has(String(p.id)),
            };
          } catch (favoriteError) {
            nextProduct = p;
          }
        }
        if (!mounted) return;
        setProduct(nextProduct);
        // preselect first variant if available
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const firstAvailable = p.variants.find((v) => Number(v.stock || 0) > 0) || p.variants[0];
          setSelectedVariant(firstAvailable);
          setSelectedAttributes(getVariantAttributeSelection(firstAvailable));
        }
      } catch (e) {
        setError(e?.message || "Lỗi khi tải sản phẩm");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id]);

  // load similar products from same category (limit 4)
  useEffect(() => {
    let mounted = true;
    async function loadSimilar() {
      if (!product) return setSimilarProducts([]);
      // try to derive category identifier: prefer category id, then name
      let categoryParam = null;
      try {
        const c = Array.isArray(product.categories) ? product.categories[0] : product.categories;
        if (c) {
          categoryParam = c.id ?? c._id ?? c.name ?? c.title ?? c;
        }
      } catch (e) {
        categoryParam = null;
      }
      if (!categoryParam) return setSimilarProducts([]);
      try {
        const res = await productsService.getProducts({ category: categoryParam, per_page: 8 });
        if (!mounted) return;
        const items = (res.items || []).filter((it) => String(it.id) !== String(product.id)).slice(0, 4);
        setSimilarProducts(items);
      } catch (e) {
        if (mounted) setSimilarProducts([]);
      }
    }
    loadSimilar();
    return () => (mounted = false);
  }, [product]);

  if (loading) return <div className="p-12">Đang tải...</div>;
  if (error) return <div className="p-12 text-red-600">{error}</div>;
  if (!product) return <div className="p-12">Không tìm thấy sản phẩm.</div>;

  const variants = product.variants || [];

  const normalizeNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const getCurrentPrice = (price, discount) => {
    const basePrice = Number(price || 0);
    const discountAmount = Number(discount || 0);
    return Math.max(basePrice - discountAmount, 0);
  };

  const getDiscountAmount = (price, discount) => {
    const basePrice = Number(price || 0);
    const discountAmount = Number(discount || 0);
    return discountAmount > 0 && discountAmount <= basePrice ? discountAmount : 0;
  };

  const formatCurrency = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

  const handleAddToCart = async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      notification.warning({
        message: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập trước khi thêm sản phẩm vào giỏ hàng.",
      });
      navigate("/login");
      return;
    }

    if (!selectedVariant?.id) {
      notification.warning({
        message: "Chọn phân loại",
        description: "Vui lòng chọn đầy đủ thuộc tính sản phẩm trước khi thêm vào giỏ hàng.",
      });
      return;
    }

    try {
      setAddingToCart(true);
      await CartService.addItem(selectedVariant.id, quantity);
      window.dispatchEvent(new Event("cart:updated"));
      notification.success({
        message: "Đã thêm vào giỏ hàng",
        description: "Sản phẩm đã được thêm vào giỏ hàng của bạn.",
      });
    } catch (e) {
      notification.error({
        message: "Không thể thêm vào giỏ hàng",
        description: e?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      notification.warning({
        message: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập trước khi thêm sản phẩm vào yêu thích.",
      });
      navigate("/login");
      return;
    }

    if (!product?.id || favoriteLoading) return;

    const nextFavorite = !product.isFavorite;
    setProduct((prev) => prev ? { ...prev, isFavorite: nextFavorite } : prev);
    setFavoriteLoading(true);

    try {
      if (nextFavorite) {
        await productsService.addFavorite(product.id);
      } else {
        await productsService.removeFavorite(product.id);
      }

      notification.success({
        message: nextFavorite ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích",
        description: nextFavorite
          ? "Sản phẩm đã được lưu vào danh sách yêu thích của bạn."
          : "Sản phẩm đã được xóa khỏi danh sách yêu thích.",
      });
    } catch (e) {
      setProduct((prev) => prev ? { ...prev, isFavorite: !nextFavorite } : prev);
      notification.error({
        message: "Không thể cập nhật yêu thích",
        description: e?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const attributeGroupMap = new Map();
  variants.forEach((variant) => {
    getVariantAttributeValues(variant).forEach((attribute) => {
      const typeKey = getAttributeTypeKey(attribute);
      const valueKey = getAttributeValueKey(attribute);
      const meta = getAttributeMeta(attribute);

      if (!attributeGroupMap.has(typeKey)) {
        attributeGroupMap.set(typeKey, {
          key: typeKey,
          label: getAttributeTypeLabel(attribute, typeKey),
          kind: getAttributeKind(attribute),
          options: new Map(),
        });
      }

      const group = attributeGroupMap.get(typeKey);
      if (!group.options.has(valueKey)) {
        group.options.set(valueKey, {
          value: valueKey,
          display: getAttributeDisplay(attribute),
          hex: meta.hex ?? meta.color ?? null,
        });
      }
    });
  });

  const attributeGroups = Array.from(attributeGroupMap.values())
    .map((group) => ({ ...group, options: Array.from(group.options.values()) }))
    .sort((a, b) => {
      const order = { color: 0, size: 1, material: 2, default: 3 };
      return order[a.kind] - order[b.kind];
    });

  const findVariantWithSelection = (selection) =>
    variants.find((variant) => {
      if (Number(variant.stock || 0) <= 0) return false;
      const variantSelection = getVariantAttributeSelection(variant);
      return Object.entries(selection).every(
        ([typeKey, valueKey]) => String(variantSelection[typeKey]) === String(valueKey)
      );
    });

  const isAttributeOptionAvailable = (typeKey, valueKey) =>
    variants.some((variant) => {
      if (Number(variant.stock || 0) <= 0) return false;
      const variantSelection = getVariantAttributeSelection(variant);
      return String(variantSelection[typeKey]) === String(valueKey);
    });

  const handleAttributeSelect = (typeKey, valueKey) => {
    const nextSelection = { ...selectedAttributes, [typeKey]: valueKey };
    const exactVariant = findVariantWithSelection(nextSelection);
    const matchingVariant = exactVariant ?? variants.find((variant) => {
      if (Number(variant.stock || 0) <= 0) return false;
      const variantSelection = getVariantAttributeSelection(variant);
      return String(variantSelection[typeKey]) === String(valueKey);
    });

    if (!matchingVariant) return;

    setSelectedVariant(matchingVariant);
    setSelectedAttributes(getVariantAttributeSelection(matchingVariant));
    setQuantity(1);
  };

  const clearSelection = () => {
    setSelectedAttributes({});
    setSelectedVariant(null);
  };

  return (
    <div className="max-w-max-width mx-auto px-gutter py-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg" ref={productSectionRef} onClick={handleBlankClick}>
        <div>
          <div className="rounded-lg overflow-hidden bg-surface-container aspect-[3/4] md:aspect-[4/5]">
            <img src={selectedVariant?.image ?? product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div>
          <h1 className="text-blue-800 font-headline-lg text-headline-lg mb-md text-4xl md:text-5xl">{product.name}</h1>

          {/* Price block: prefer variant price if selected, show original+discount when both available */}
          {(() => {
            const formatCurrency = (n) => `${Number(n || 0).toLocaleString('vi-VN')} VNĐ`;
            const pv = selectedVariant || {};
            const originalPrice = Number(
              pv.price ?? pv.unit_price ?? pv.original_price ?? pv.regular_price ?? product.originalPrice ?? product.price ?? 0
            );
            const discountAmount = Number(
              pv.discount_price ?? pv.unit_discount_price ?? product.discountAmount ?? 0
            );
            const finalPrice = Math.max(originalPrice - discountAmount, 0);
            const showBoth = originalPrice > 0 && discountAmount > 0 && finalPrice < originalPrice;
            if (showBoth) {
              return (
                <div className="mb-md">
                  <div className="flex items-baseline gap-3">
                    <div className="text-on-surface-variant line-through ">{formatCurrency(originalPrice)}</div>
                    <div className=" text-red-500 font-bold text-3xl md:text-4xl">{formatCurrency(finalPrice)}</div>
                  </div>
                  <div className="text-sm text-on-surface-variant mt-2">Chưa có đánh giá</div>
                </div>
              );
            }
            const display = finalPrice || originalPrice || 0;
            return (
              <div className="mb-md">
                <div className="font-bold text-3xl md:text-4xl">{formatCurrency(display)}</div>
                <div className="text-sm text-on-surface-variant mt-2">Chưa có đánh giá</div>
              </div>
            );
          })()}

          <hr className="my-4 border-t border-divider" />
          <h3 className="text-2xl font-semibold mb-3">Mô tả sản phẩm</h3>
          <p className="text-base text-on-surface-variant mb-4 text-xl md:text-xl">{product.description}</p>

          {variants.length > 0 && (
            <div className="space-y-5">
              {attributeGroups.map((group) => {
                const selectedValue = selectedAttributes[group.key];
                const selectedOption = group.options.find(
                  (option) => String(option.value) === String(selectedValue)
                );

                return (
                  <div key={group.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="font-label-sm text-on-surface">{group.label}</h4>
                      {selectedOption && (
                        <span className="text-sm text-on-surface-variant">— {selectedOption.display}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {group.options.map((option) => {
                        const available = isAttributeOptionAvailable(group.key, option.value);
                        const selected = String(selectedValue) === String(option.value);

                        if (group.kind === 'color' && option.hex) {
                          return (
                            <button
                              key={option.value}
                              type="button"
                              title={option.display}
                              aria-label={`${group.label}: ${option.display}`}
                              disabled={!available}
                              onClick={() => handleAttributeSelect(group.key, option.value)}
                              className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                                selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-800'
                              } ${available ? 'cursor-pointer hover:border-blue-500' : 'cursor-not-allowed opacity-35'}`}
                            >
                              <span
                                className="block h-6 w-6 rounded-full border border-black/15"
                                style={{ backgroundColor: option.hex }}
                              />
                              <span>{option.display}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={!available}
                            onClick={() => handleAttributeSelect(group.key, option.value)}
                            className={`min-w-18 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 bg-white text-gray-800 hover:border-blue-500'
                            } ${available ? '' : 'cursor-not-allowed opacity-35'}`}
                          >
                            {option.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-4 mt-7">
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 text-lg"
              >
                –
              </button>
              <div className="px-6 py-3 border-l border-r text-lg">{quantity}</div>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-4 py-3 text-lg"
              >
                +
              </button>
            </div>

            <button
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md flex-1 md:flex-initial"
              type="button"
              disabled={addingToCart || Number(selectedVariant?.stock || 0) <= 0 || !selectedVariant?.id}
              onClick={handleAddToCart}>
              {addingToCart ? "Đang thêm..." : (Number(selectedVariant?.stock || 0) <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng")}
            </button>

            <button
              aria-label={product.isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              className={`border p-3 rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                product.isFavorite
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-gray-300 bg-white text-gray-700 hover:border-red-400 hover:text-red-500"
              }`}
              type="button"
              disabled={favoriteLoading}
              onClick={handleToggleFavorite}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: product.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
            </button>
          </div>
        </div>
      </div>
    <hr className="m-10 border-t border-divider" />
      {/* Product description / highlights section moved below add-to-cart area */}
      <div className="mt-10">
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <h2 className="text-3xl mb-4">Mô tả sản phẩm</h2>
            <ul className="list-disc pl-5 space-y-2 ">
              {(product.highlights || [
                '100% Cotton tự nhiên',
                'Thấm hút mồ hôi, thoáng mát',
                'Form dáng chuẩn, không biến dạng',
                'Dễ dàng phối đồ cho mọi dịp'
              ]).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        <div>
            <div className="bg-surface-container-lowest p-6 rounded-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-md bg-white flex items-center justify-center border">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Chất liệu cao cấp</div>
                  <div className=" text-on-surface-variant">Đảm bảo độ bền và ít nhăn</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-white flex items-center justify-center border">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium :">Tỉ mỉ cắt may</div>
                  <div className=" text-on-surface-variant">Hoàn thiện gia công cho form chuẩn</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    <hr className="m-10 border-t border-divider" />
      {/* Similar products section */}
      {similarProducts && similarProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl">Sản phẩm tương tự</h2>
            {(() => {
              let categoryParam = null;
              try {
                const c = Array.isArray(product?.categories) ? product.categories[0] : product?.categories;
                if (c) categoryParam = c.id ?? c._id ?? c.name ?? c.title ?? c;
              } catch (e) {
                categoryParam = null;
              }
              if (categoryParam) {
                return (
                  <Link to={`/products?category=${encodeURIComponent(categoryParam)}`} className="text-blue-600">Xem tất cả</Link>
                );
              }
              return null;
            })()}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="group bg-white border rounded-lg overflow-hidden">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2">
                  <div className="text-sm text-on-surface-variant truncate">{p.category}</div>
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="font-bold text-red-600 mt-1">{p.priceDisplay}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
