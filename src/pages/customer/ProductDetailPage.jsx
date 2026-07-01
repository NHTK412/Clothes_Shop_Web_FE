/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Image, Rate, Spin, notification } from "antd";
import Cookies from "js-cookie";
import productsService from "../../services/ProductsService";
import CartService from "../../services/CartService";
import ProfileService from "../../services/ProfileService";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api")
  .replace(/\/api\/?$/, "");

const EMPTY_REVIEW_SUMMARY = {
  average_rating: 0,
  total_reviews: 0,
  distribution: [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: 0,
    percentage: 0,
  })),
};

const resolveMediaUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BACKEND_ORIGIN}/${String(value).replace(/^\/+/, "")}`;
};

const formatReviewDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getCustomerInitial = (customer) =>
  String(customer?.name || "K").trim().charAt(0).toUpperCase();

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
  const [reviewSummary, setReviewSummary] = useState(EMPTY_REVIEW_SUMMARY);
  const [reviews, setReviews] = useState([]);
  const [reviewPagination, setReviewPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [reviewRating, setReviewRating] = useState("");
  const [reviewImageFilter, setReviewImageFilter] = useState("");
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
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

  useEffect(() => {
    let mounted = true;

    const loadReviewSummary = async () => {
      try {
        const response = await productsService.getProductReviewsSummary(id);
        if (!mounted) return;
        setReviewSummary({
          ...EMPTY_REVIEW_SUMMARY,
          ...(response || {}),
          distribution: Array.isArray(response?.distribution)
            ? response.distribution
            : EMPTY_REVIEW_SUMMARY.distribution,
        });
      } catch {
        if (mounted) setReviewSummary(EMPTY_REVIEW_SUMMARY);
      }
    };

    loadReviewSummary();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");
      try {
        const response = await productsService.getProductReviews(id, {
          rating: reviewRating || undefined,
          has_images: reviewImageFilter === "" ? undefined : reviewImageFilter,
          sort: reviewSort,
          page: reviewPage,
          per_page: 10,
        });
        if (!mounted) return;
        setReviews(response.items);
        setReviewPagination(response.pagination);
      } catch (reviewError) {
        if (!mounted) return;
        setReviews([]);
        setReviewsError(
          reviewError?.response?.data?.message ||
          "Không thể tải đánh giá sản phẩm. Vui lòng thử lại.",
        );
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };

    loadReviews();
    return () => {
      mounted = false;
    };
  }, [id, reviewImageFilter, reviewPage, reviewRating, reviewSort]);

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
          <h1 className="mb-md text-3xl font-bold leading-tight text-blue-800 sm:text-4xl lg:text-5xl">{product.name}</h1>

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
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="text-on-surface-variant line-through ">{formatCurrency(originalPrice)}</div>
                    <div className=" text-red-500 font-bold text-3xl md:text-4xl">{formatCurrency(finalPrice)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Rate
                      allowHalf
                      disabled
                      value={Number(reviewSummary.average_rating || 0)}
                      className="text-base"
                    />
                    <span className="text-sm font-semibold text-on-surface">
                      {Number(reviewSummary.average_rating || 0).toLocaleString("vi-VN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <a href="#product-reviews" className="text-sm text-primary hover:underline">
                      ({Number(reviewSummary.total_reviews || 0).toLocaleString("vi-VN")} đánh giá)
                    </a>
                  </div>
                </div>
              );
            }
            const display = finalPrice || originalPrice || 0;
            return (
              <div className="mb-md">
                <div className="font-bold text-3xl md:text-4xl">{formatCurrency(display)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Rate
                    allowHalf
                    disabled
                    value={Number(reviewSummary.average_rating || 0)}
                    className="text-base"
                  />
                  <span className="text-sm font-semibold text-on-surface">
                    {Number(reviewSummary.average_rating || 0).toLocaleString("vi-VN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <a href="#product-reviews" className="text-sm text-primary hover:underline">
                    ({Number(reviewSummary.total_reviews || 0).toLocaleString("vi-VN")} đánh giá)
                  </a>
                </div>
              </div>
            );
          })()}

          <hr className="my-4 border-t border-divider" />
          <h3 className="text-2xl font-semibold mb-3">Mô tả sản phẩm</h3>
          <p className="mb-4 text-base leading-7 text-on-surface-variant sm:text-lg">{product.description}</p>

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

          <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
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
              className="order-3 w-full rounded-md bg-blue-600 px-8 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 sm:order-none sm:w-auto sm:flex-1 md:flex-initial"
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
    <hr className="my-8 border-t border-divider sm:my-10" />
      {/* Product description / highlights section moved below add-to-cart area */}
      <div className="mt-10">
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <h2 className="mb-4 text-2xl sm:text-3xl">Mô tả sản phẩm</h2>
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
      <hr className="my-8 border-t border-divider sm:my-10" />

      <section id="product-reviews" className="scroll-mt-24">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Khách hàng nói gì
          </p>
          <h2 className="mt-1 text-2xl font-bold text-on-surface sm:text-3xl">
            Đánh giá sản phẩm
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="border-b border-outline-variant pb-5 text-center">
              <p className="text-5xl font-bold text-primary">
                {Number(reviewSummary.average_rating || 0).toLocaleString("vi-VN", {
                  maximumFractionDigits: 2,
                })}
              </p>
              <Rate
                allowHalf
                disabled
                value={Number(reviewSummary.average_rating || 0)}
                className="mt-2"
              />
              <p className="mt-2 text-sm text-on-surface-variant">
                Dựa trên {Number(reviewSummary.total_reviews || 0).toLocaleString("vi-VN")} đánh giá
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {reviewSummary.distribution.map((item) => (
                <button
                  type="button"
                  key={item.rating}
                  onClick={() => {
                    setReviewRating(String(item.rating));
                    setReviewPage(1);
                  }}
                  className={`grid w-full grid-cols-[52px_1fr_42px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-container-low ${
                    String(reviewRating) === String(item.rating)
                      ? "bg-secondary-container"
                      : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    {item.rating}
                    <span
                      className="material-symbols-outlined text-base text-amber-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                    <span
                      className="block h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, Number(item.percentage || 0)))}%` }}
                    />
                  </span>
                  <span className="text-right text-xs text-on-surface-variant">
                    {Number(item.count || 0)}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewRating("");
                    setReviewPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    reviewRating === ""
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  Tất cả
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    type="button"
                    key={rating}
                    onClick={() => {
                      setReviewRating(String(rating));
                      setReviewPage(1);
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      String(reviewRating) === String(rating)
                        ? "bg-primary text-on-primary"
                        : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {rating}
                    <span className="material-symbols-outlined text-base">star</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={reviewImageFilter}
                  onChange={(event) => {
                    setReviewImageFilter(event.target.value);
                    setReviewPage(1);
                  }}
                  className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="Lọc đánh giá theo hình ảnh"
                >
                  <option value="">Tất cả hình ảnh</option>
                  <option value="1">Có hình ảnh</option>
                  <option value="0">Không có hình ảnh</option>
                </select>
                <select
                  value={reviewSort}
                  onChange={(event) => {
                    setReviewSort(event.target.value);
                    setReviewPage(1);
                  }}
                  className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="Sắp xếp đánh giá"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="highest_rating">Điểm cao nhất</option>
                  <option value="lowest_rating">Điểm thấp nhất</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              {reviewsLoading ? (
                <div className="flex min-h-64 items-center justify-center">
                  <Spin size="large" tip="Đang tải đánh giá..." />
                </div>
              ) : reviewsError ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-error">error</span>
                  <p className="mt-2 text-sm text-error">{reviewsError}</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline">reviews</span>
                  <h3 className="mt-3 text-lg font-semibold text-on-surface">
                    Chưa có đánh giá phù hợp
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Hãy thử thay đổi bộ lọc để xem các đánh giá khác.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {reviews.map((review) => (
                    <article key={review.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary-container">
                          {review.customer?.avatar ? (
                            <img
                              src={resolveMediaUrl(review.customer.avatar)}
                              alt={review.customer?.name || "Khách hàng"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-bold text-primary">
                              {getCustomerInitial(review.customer)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-on-surface">
                                {review.customer?.name || "Khách hàng"}
                              </p>
                              <Rate
                                disabled
                                value={Number(review.rating || 0)}
                                className="text-sm"
                              />
                            </div>
                            <time className="text-xs text-on-surface-variant">
                              {formatReviewDate(review.created_at)}
                            </time>
                          </div>

                          {Array.isArray(review.variant?.attributes) && review.variant.attributes.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {review.variant.attributes.map((attribute) => (
                                <span
                                  key={`${attribute.type}-${attribute.value}`}
                                  className="rounded-full bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant"
                                >
                                  {attribute.type_label || attribute.type}:{" "}
                                  <strong className="text-on-surface">
                                    {attribute.value_label || attribute.value}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-on-surface">
                            {review.comment || "Khách hàng không để lại bình luận."}
                          </p>

                          {Array.isArray(review.images) && review.images.length > 0 ? (
                            <Image.PreviewGroup>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {review.images.map((image, index) => {
                                  const imageUrl = resolveMediaUrl(image?.url || image);
                                  return (
                                    <Image
                                      key={image?.id || `${review.id}-${index}`}
                                      src={imageUrl}
                                      alt={`Ảnh đánh giá ${index + 1}`}
                                      width={88}
                                      height={88}
                                      className="rounded-lg object-cover"
                                    />
                                  );
                                })}
                              </div>
                            </Image.PreviewGroup>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {reviewPagination.last_page > 1 ? (
                <div className="flex flex-col gap-3 border-t border-outline-variant px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-on-surface-variant">
                    {Number(reviewPagination.total || 0).toLocaleString("vi-VN")} đánh giá
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reviewPage <= 1 || reviewsLoading}
                      onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                      className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <span className="px-2 text-sm font-medium">
                      {reviewPagination.current_page || reviewPage}/{reviewPagination.last_page}
                    </span>
                    <button
                      type="button"
                      disabled={reviewPage >= reviewPagination.last_page || reviewsLoading}
                      onClick={() => setReviewPage((page) => Math.min(reviewPagination.last_page, page + 1))}
                      className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <hr className="my-8 border-t border-divider sm:my-10" />
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
