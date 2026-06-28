/* eslint-disable no-useless-assignment */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { notification } from "antd";
import Cookies from "js-cookie";
import productsService from "../../services/ProductsService";
import CartService from "../../services/CartService";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const normalizeSize = (str) => {
    if (!str) return null;
    const s = String(str).toLowerCase().trim();
    if (/^(s|small)$/.test(s)) return "S";
    if (/^(m|medium)$/.test(s)) return "M";
    if (/^(l|large)$/.test(s)) return "L";
    if (/^(xl|x-large|xlarge|extra large|extra-large|x l)$/.test(s)) return "XL";
    return null;
  };

  const getVariantSize = (variant) => {
    const avs = variant.attribute_values || [];
    const sizeAv = avs.find((av) => {
      const raw = String(av.display_value ?? av.value ?? "").toLowerCase().trim();
      if (Number(av.attribute_type_id) === 2) return true;
      return /^(s|m|l|xl|xxl|small|medium|large)$/.test(raw);
    });
    if (!sizeAv) return null;
    return normalizeSize(String(sizeAv.display_value ?? sizeAv.value ?? "").toLowerCase());
  };

  const getVariantColor = (variant) => {
    const avs = variant.attribute_values || [];
    const colorAv = avs.find((av) => {
      const raw = String(av.display_value ?? av.value ?? "").toLowerCase().trim();
      if (Number(av.attribute_type_id) === 1) return true;
      return /^(white|black|blue|red|brown|grey|gray|green|yellow|pink|purple)$/.test(raw) || raw.includes('color');
    });
    if (!colorAv) return null;
    return String(colorAv.value ?? colorAv.display_value ?? colorAv.id ?? "").trim();
  };

  const isColorAvailable = (colorValue) => {
    return variants.some((v) => {
      if (Number(v.stock || 0) <= 0) return false;
      if (selectedSize) {
        return (
          String(getVariantColor(v)) === String(colorValue) &&
          String(getVariantSize(v)) === String(selectedSize)
        );
      }
      return String(getVariantColor(v)) === String(colorValue);
    });
  };

  const isSizeAvailable = (sizeValue) => {
    return variants.some((v) => {
      if (Number(v.stock || 0) <= 0) return false;
      if (selectedColor) {
        return (
          String(getVariantSize(v)) === String(sizeValue) &&
          String(getVariantColor(v)) === String(selectedColor)
        );
      }
      return String(getVariantSize(v)) === String(sizeValue);
    });
  };

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
      try {
        const p = await productsService.getProduct(id);
        if (!mounted) return;
        setProduct(p);
        // preselect first variant if available
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const firstAvailable = p.variants.find((v) => Number(v.stock || 0) > 0) || p.variants[0];
          setSelectedVariant(firstAvailable);
          const avs = firstAvailable.attribute_values || [];
          const sizeAv = avs.find((av) => Number(av.attribute_type_id) === 2 || /^(s|m|l|xl|small|medium|large)$/i.test(String((av.display_value||av.value||'')).toLowerCase()));
          const colorAv = avs.find((av) => Number(av.attribute_type_id) === 1 || /^(white|black|blue|red|brown|grey|gray|green|yellow|pink|purple)$/i.test(String((av.display_value||av.value||'')).toLowerCase()));
          if (sizeAv) {
            const ns = normalizeSize(((sizeAv.display_value ?? sizeAv.value) || '').toString().toLowerCase());
            if (ns) setSelectedSize(ns);
          }
          if (colorAv) setSelectedColor(colorAv.value ?? colorAv.display_value);
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
        description: "Vui lòng chọn màu sắc và kích cỡ trước khi thêm vào giỏ hàng.",
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

  const sizeSet = new Map();
  const colorSet = new Map();
  variants.forEach((v) => {
    const size = getVariantSize(v);
    const color = getVariantColor(v);
    if (size && !sizeSet.has(size)) {
      sizeSet.set(size, { value: size, display: size });
    }
    if (color && !colorSet.has(color)) {
      const avs = v.attribute_values || [];
      const colorAv = avs.find((av) => String(av.value ?? av.display_value ?? av.id) === String(color));
      const display = colorAv?.display_value ?? colorAv?.value ?? color;
      const lower = String(display).toLowerCase().trim();
      let hex = null;
      try {
        const md = colorAv?.meta_data;
        const parsed = typeof md === "string" ? JSON.parse(md || "{}") : (md || {});
        hex = parsed.hex || parsed.color || null;
      } catch (e) {
        hex = null;
      }
      if (!hex) {
        const cmap = { white: "#FFFFFF", black: "#000000", blue: "#1F66FF", red: "#FF0000", brown: "#8A3B0A", grey: "#9CA3AF", gray: "#9CA3AF", green: "#10B981", yellow: "#F59E0B", pink: "#EC4899", purple: "#8B5CF6" };
        hex = cmap[lower] || null;
      }
      colorSet.set(color, { value: color, display, hex });
    }
  });
  // ensure sizes shown in canonical order S, M, L, XL
  const sizeOrder = ['S', 'M', 'L', 'XL'];
  const sizes = sizeOrder.filter((k) => sizeSet.has(k)).map((k) => sizeSet.get(k));
  const colors = Array.from(colorSet.values());
  const selectedColorDisplay = colors.find((c) => String(c.value) === String(selectedColor))?.display ?? (selectedColor || "");

  const findVariantWithSelection = (color, size) => {
    return variants.find((v) => {
      if (Number(v.stock || 0) <= 0) return false;
      if (color && String(getVariantColor(v)) !== String(color)) return false;
      if (size && String(getVariantSize(v)) !== String(size)) return false;
      return true;
    });
  };

  const clearSelection = () => {
    setSelectedColor("");
    setSelectedSize("");
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
            const pv = selectedVariant || {};
            const variantPrice = normalizeNumber(
              pv.price ?? pv.original_price ?? pv.regular_price ?? pv.list_price ?? pv.unitPrice ?? pv.priceAmount
            );
            const variantSalePrice = normalizeNumber(pv.sale_price);
            const variantDiscountPrice = normalizeNumber(pv.discount_price);
            const productPrice = normalizeNumber(
              product.price ?? product.original_price ?? product.regular_price ?? product.list_price ?? product.unitPrice ?? product.priceAmount
            );
            const productDiscount = normalizeNumber(product.discount_price ?? product.sale_price);
            const productSalePrice = normalizeNumber(product.sale_price);
            const productComputedDiscount = productDiscount != null
              ? productDiscount
              : (productSalePrice != null && productPrice != null
                ? Math.max(productPrice - productSalePrice, 0)
                : null);

            const hasVariantPricing = variantPrice != null || variantSalePrice != null || variantDiscountPrice != null;
            const basePrice = hasVariantPricing
              ? (variantPrice ?? productPrice ?? variantSalePrice ?? 0)
              : (productPrice ?? 0);

            const variantComputedDiscount = variantDiscountPrice != null
              ? variantDiscountPrice
              : (variantSalePrice != null && (variantPrice != null || productPrice != null)
                ? Math.max((variantPrice ?? productPrice ?? 0) - variantSalePrice, 0)
                : null);

            const discountAmount = hasVariantPricing
              ? (variantComputedDiscount ?? productComputedDiscount ?? 0)
              : (productComputedDiscount ?? 0);

            const currentPrice = getCurrentPrice(basePrice, discountAmount);
            const hasDiscount = discountAmount > 0 && discountAmount <= basePrice;

            if (hasDiscount) {
              return (
                <div className="mb-md">
                  <div className="text-on-surface-variant line-through text-2xl md:text-3xl">{formatCurrency(basePrice)}</div>
                  <div className="mt-3 text-red-500 font-bold text-3xl md:text-4xl">{formatCurrency(currentPrice)}</div>
                </div>
              );
            }

            return (
              <div className="mb-md">
                <div className="font-bold text-3xl md:text-4xl">
                  {basePrice > 0 ? formatCurrency(basePrice) : product.priceDisplay ?? formatCurrency(basePrice)}
                </div>
                <div className="text-sm text-on-surface-variant mt-2">Chưa có đánh giá</div>
              </div>
            );
          })()}

          <hr className="my-4 border-t border-divider" />
          <h3 className="text-2xl font-semibold mb-3">Mô tả sản phẩm</h3>
          <p className="text-base text-on-surface-variant mb-4 text-xl md:text-xl">{product.description}</p>

          {variants.length > 0 && (
            <>
              {colors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-1xl">Màu sắc: </h4>
                    {selectedColorDisplay ? (
                      <div className=" font-medium text-1xl text-gray-700">{selectedColorDisplay}</div>
                    ) : null}
                  </div>
                  <div
                    className="flex items-center gap-3"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) clearSelection();
                    }}
                  >
                    {colors.map((c) => {
                      const available = isColorAvailable(c.value);
                      return (
                        <button
                          key={c.value}
                          aria-label={c.display}
                          type="button"
                          onClick={() => {
                            if (!available) return;
                            setSelectedColor(c.value);
                            const found = findVariantWithSelection(c.value, selectedSize) || findVariantWithSelection(c.value, null);
                            if (found) {
                              setSelectedVariant(found);
                              setSelectedSize(getVariantSize(found) || selectedSize);
                            } else {
                              const fallback = findVariantWithSelection(c.value, null);
                              if (fallback) {
                                setSelectedVariant(fallback);
                                setSelectedSize(getVariantSize(fallback) || '');
                              }
                            }
                          }}
                          disabled={!available}
                          className={`w-12 h-10 rounded-full border-2 flex items-center justify-center p-1 transition ${selectedColor === c.value ? 'ring-2 ring-blue-600' : ''} ${available ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                          style={{ background: 'transparent' }}
                        >
                          <span className="block w-full h-full rounded-full border" style={{ background: c.hex || '#FFFFFF' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-label-sm mb-2 mt-5">Kích cỡ</h4>
                  <div
                    className="flex gap-3 mb-3 mt-2"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) clearSelection();
                    }}
                  >
                    {sizes.map((s) => {
                      const available = isSizeAvailable(s.value);
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => {
                            if (!available) return;
                            setSelectedSize(s.value);
                            const found = findVariantWithSelection(selectedColor, s.value) || findVariantWithSelection(null, s.value);
                            if (found) {
                              setSelectedVariant(found);
                              setSelectedColor(getVariantColor(found) || selectedColor);
                            } else {
                              const fallback = findVariantWithSelection(null, s.value);
                              if (fallback) {
                                setSelectedVariant(fallback);
                                setSelectedColor(getVariantColor(fallback) || '');
                              }
                            }
                          }}
                          disabled={!available}
                          className={`px-6 py-3 min-w-[72px] border rounded-md text-base font-medium transition-colors ${selectedSize === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'} ${available ? '' : 'opacity-40 cursor-not-allowed'}`}
                        >
                          {s.display}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              
            </>
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

            <button className="border p-3 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-8.682a4.5 4.5 0 010-6.364z" />
              </svg>
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
