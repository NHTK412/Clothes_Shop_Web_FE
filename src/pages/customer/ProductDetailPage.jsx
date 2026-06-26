/* eslint-disable no-useless-assignment */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { notification } from "antd";
import Cookies from "js-cookie";
import productsService from "../../services/ProductsService";
import CartService from "../../services/CartService";
import ProfileService from "../../services/ProfileService";

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
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const normalizeSize = (str) => {
    if (!str) return null;
    const s = String(str).toLowerCase().trim();
    if (/^(s|small)$/.test(s)) return "S";
    if (/^(m|medium)$/.test(s)) return "M";
    if (/^(l|large)$/.test(s)) return "L";
    if (/^(xl|x-large|xlarge|extra large|extra-large|x l)$/.test(s)) return "XL";
    return null;
  };
  const [activeTab, setActiveTab] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
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
        if (p?.variants && p.variants.length > 0) setSelectedVariant(p.variants[0]);
        if (p?.variants && p.variants.length > 0) {
          const first = p.variants[0];
          const avs = first.attribute_values || [];
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

  // derive available sizes and colors from variants' attribute_values
  const sizeSet = new Map();
  const colorSet = new Map();
  variants.forEach((v) => {
    const avs = v.attribute_values || [];
    avs.forEach((av) => {
      const rawVal = av.value ?? av.display_value ?? av.id;
      const key = String(rawVal);
      const display = av.display_value ?? av.value ?? String(av.id);
      // Heuristic: attribute_type_id 1=color, 2=size — fall back to name matching
      const typeId = av.attribute_type_id;
      const lower = (av.display_value || av.value || "").toString().toLowerCase().trim();
      const sizeRegex = /^(s|m|l|xl|xxl|small|medium|large)$/i;
      const colorRegex = /^(white|black|blue|red|brown|grey|gray|green|yellow|pink|purple)$/i;
      const normSize = normalizeSize(lower);
      if (typeId === 2 || sizeRegex.test(lower)) {
        const sizeKey = normSize || key;
        const sizeDisplay = normSize || display;
        if (['S','M','L','XL'].includes(String(sizeKey))) {
          if (!sizeSet.has(sizeKey)) sizeSet.set(sizeKey, { value: sizeKey, display: sizeDisplay });
        }
      } else if (typeId === 1 || colorRegex.test(lower) || lower.includes('color')) {
        // attempt to extract hex from meta_data
        let hex = null;
        try {
          const md = av.meta_data;
          const parsed = typeof md === "string" ? JSON.parse(md || "{}") : (md || {});
          hex = parsed.hex || parsed.color || null;
        } catch (e) {
          hex = null;
        }
        if (!hex) {
          const cmap = { white: "#FFFFFF", black: "#000000", blue: "#1F66FF", red: "#FF0000", brown: "#8A3B0A", grey: "#9CA3AF", gray: "#9CA3AF" };
          hex = cmap[lower] || null;
        }
        if (!colorSet.has(key)) colorSet.set(key, { value: key, display, hex });
      } else {
        // fallback: if looks like color name include as color, else as size
        if (/^[#0-9a-fA-F]{3,7}$/.test(key) || /color/.test(lower)) {
          if (!colorSet.has(key)) colorSet.set(key, { value: key, display, hex: key.startsWith('#') ? key : null });
        } else {
          // fallback: try normalize as size
          const ns = normalizeSize(lower);
          if (ns && !sizeSet.has(ns)) sizeSet.set(ns, { value: ns, display: ns });
        }
      }
    });
  });
  // ensure sizes shown in canonical order S, M, L, XL
  const sizeOrder = ['S', 'M', 'L', 'XL'];
  const sizes = sizeOrder.filter((k) => sizeSet.has(k)).map((k) => sizeSet.get(k));
  const colors = Array.from(colorSet.values());
  const selectedColorDisplay = colors.find((c) => String(c.value) === String(selectedColor))?.display ?? (selectedColor || "");

  return (
    <div className="max-w-max-width mx-auto px-gutter py-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div>
          <div className=" rounded-lg overflow-hidden bg-surface-container">
            <img src={selectedVariant?.image ?? product.image} alt={product.name} className="w-full object-cover" />
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
                  <div className="flex items-center gap-3">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        aria-label={c.display}
                        onClick={() => {
                          setSelectedColor(c.value);
                          const found = variants.find((v) => {
                            const avs = v.attribute_values || [];
                            const hasColor = avs.some((av) => String(av.value) === String(c.value) || String(av.display_value) === String(c.display));
                            const hasSize = selectedSize ? avs.some((av) => {
                              const norm = normalizeSize((av.display_value || av.value || '').toString().toLowerCase());
                              return norm === selectedSize;
                            }) : true;
                            return hasColor && hasSize;
                          });
                          if (found) setSelectedVariant(found);
                        }}
                        className={`w-12 h-10 rounded-full border-2 flex items-center justify-center p-1 ${selectedColor === c.value ? 'ring-2 ring-blue-600' : ''}`}
                        style={{ background: 'transparent' }}
                      >
                        <span className="block w-full h-full rounded-full border" style={{ background: c.hex || '#FFFFFF' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-label-sm mb-2 mt-5">Kích cỡ</h4>
                  <div className="flex gap-3 mb-3 mt-2">
                    {sizes.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setSelectedSize(s.value);
                          const found = variants.find((v) => {
                            const avs = v.attribute_values || [];
                            const hasSize = avs.some((av) => {
                              const norm = normalizeSize((av.display_value || av.value || '').toString().toLowerCase());
                              return norm === s.value;
                            });
                            const hasColor = selectedColor ? avs.some((av) => String(av.value) === String(selectedColor) || String(av.display_value) === String(selectedColor)) : true;
                            return hasSize && hasColor;
                          });
                          if (found) setSelectedVariant(found);
                        }}
                        className={`px-6 py-3 min-w-[72px] border rounded-md text-base font-medium transition-colors ${selectedSize === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      >
                        {s.display}
                      </button>
                    ))}
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
              disabled={addingToCart}
              onClick={handleAddToCart}>
              {addingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
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
            <h3 className="text-2xl font-semibold mb-3">Đặc điểm nổi bật</h3>
            <p className="text-base text-on-surface-variant mb-4 text-xl md:text-xl">{product.description}</p>
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
