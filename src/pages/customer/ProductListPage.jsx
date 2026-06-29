/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { notification } from "antd";
import Cookies from "js-cookie";
import productsService from "../../services/ProductsService";
import ProfileService from "../../services/ProfileService";

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getCurrentPrice = (price, discount) => {
  const basePrice = Number(price || 0);
  const discountAmount = Number(discount || 0);
  return Math.max(basePrice - discountAmount, 0);
};

export default function ProductListPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categoriesSelected, setCategoriesSelected] = useState([]);
  const [sort, setSort] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sizeSelected, setSizeSelected] = useState("");
  const [colorSelected, setColorSelected] = useState("");
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState(null);
  const [favoriteProductIds, setFavoriteProductIds] = useState(() => new Set());

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      const cats = await productsService.getCategories();
      if (!mounted) return;
      setCategories(cats || []);
    }
    loadCategories();
    return () => (mounted = false);
  }, []);

  // initialize filters from URL search params (e.g., /products?category=2)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const c = searchParams.get("category");
    if (c) {
      setCategory(c);
      setCategoriesSelected([c]);
      setPage(1);
    } else {
      setCategory("");
      setCategoriesSelected([]);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    async function loadAttributes() {
      const attrs = await productsService.getAttributes();
      if (!mounted) return;
      // attrs is an array of { name, display_name, attribute_values: [...] }
      const colorAttr = attrs.find((a) => a.name === "color" || (a.display_name || "").toLowerCase().includes("color"));
      const sizeAttr = attrs.find((a) => a.name === "size" || (a.display_name || "").toLowerCase().includes("size"));
      setColorOptions((colorAttr && Array.isArray(colorAttr.attribute_values)) ? colorAttr.attribute_values : []);
      setSizeOptions((sizeAttr && Array.isArray(sizeAttr.attribute_values)) ? sizeAttr.attribute_values : []);
    }
    loadAttributes();
    return () => (mounted = false);
  }, []);

  const categoryRef = useRef(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProducts = async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        per_page: perPage,
        page,
      };
      if (q) params.q = q;
      if (categoriesSelected && categoriesSelected.length > 0) params.category = categoriesSelected.join(",");
      else if (category) params.category = category;
      // backend expects attribute filters as attr[size]=S,M and attr[color]=Red,Blue
      if (sizeSelected) params["attr[size]"] = Array.isArray(sizeSelected) ? sizeSelected.join(",") : String(sizeSelected);
      if (colorSelected) params["attr[color]"] = Array.isArray(colorSelected) ? colorSelected.join(",") : String(colorSelected);
      if (sort) params.sort = sort;
      if (minPrice) params.min_price = Number(minPrice);
      if (maxPrice) params.max_price = Number(maxPrice);
      if (inStock) params.in_stock = true;

      // allow immediate overrides (useful when callers want to pass the new sort/page before state updates)
      Object.assign(params, opts);

      const res = await productsService.getProducts(params);
      let items = res.items || [];
      // Apply client-side sorting in case backend doesn't sort
      const sortKey = opts.sort ?? sort;
      const sortItems = (arr, key) => {
        if (!key) return arr;
        const copy = Array.isArray(arr) ? [...arr] : [];
        if (key === "price_asc") {
          copy.sort((a, b) => ((a.price == null ? Infinity : a.price) - (b.price == null ? Infinity : b.price)));
        } else if (key === "price_desc") {
          copy.sort((a, b) => ((b.price == null ? -Infinity : b.price) - (a.price == null ? -Infinity : a.price)));
        } else if (key === "newest") {
          copy.sort((a, b) => {
            const ta = a.created_at ? Date.parse(a.created_at) : 0;
            const tb = b.created_at ? Date.parse(b.created_at) : 0;
            return tb - ta;
          });
        }
        return copy;
      };

      items = sortItems(items, sortKey);
      setProducts(items.map((item) => ({
        ...item,
        isFavorite: item.isFavorite || favoriteProductIds.has(String(item.id)),
      })));
      setPagination(res.pagination || null);
    } catch (e) {
      setError(e.message || "Lỗi khi tải sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      if (!Cookies.get("access_token")) {
        setFavoriteProductIds(new Set());
        return;
      }

      try {
        const profile = await ProfileService.getProfile();
        const favorites = await productsService.getUserFavorites(profile?.id);
        if (!mounted) return;

        const favoriteIds = productsService.getFavoriteProductIds(favorites);
        setFavoriteProductIds(favoriteIds);
        setProducts((currentProducts) => currentProducts.map((item) => ({
          ...item,
          isFavorite: favoriteIds.has(String(item.id)),
        })));
      } catch (e) {
        if (mounted) setFavoriteProductIds(new Set());
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleFavorite = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    const token = Cookies.get("access_token");
    if (!token) {
      notification.warning({
        message: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập trước khi thêm sản phẩm vào yêu thích.",
      });
      navigate("/login");
      return;
    }

    if (!product?.id || favoriteUpdatingId === product.id) return;

    const nextFavorite = !product.isFavorite;
    setFavoriteProductIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextFavorite) nextIds.add(String(product.id));
      else nextIds.delete(String(product.id));
      return nextIds;
    });
    setProducts((currentProducts) => currentProducts.map((item) => (
      item.id === product.id ? { ...item, isFavorite: nextFavorite } : item
    )));
    setFavoriteUpdatingId(product.id);

    try {
      if (nextFavorite) {
        await productsService.addFavorite(product.id);
      } else {
        await productsService.removeFavorite(product.id);
      }

      notification.success({
        message: nextFavorite ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích",
      });
    } catch (e) {
      setFavoriteProductIds((currentIds) => {
        const nextIds = new Set(currentIds);
        if (nextFavorite) nextIds.delete(String(product.id));
        else nextIds.add(String(product.id));
        return nextIds;
      });
      setProducts((currentProducts) => currentProducts.map((item) => (
        item.id === product.id ? { ...item, isFavorite: !nextFavorite } : item
      )));
      notification.error({
        message: "Không thể cập nhật yêu thích",
        description: e?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setFavoriteUpdatingId(null);
    }
  };

  // when `category` state changes (including initialized from URL), reload products immediately
  useEffect(() => {
    // avoid triggering on initial empty category
    setPage(1);
    loadProducts({ category, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="max-w-max-width mx-auto px-gutter py-xl">
      <button
        type="button"
        onClick={() => setFiltersOpen((value) => !value)}
        className="mb-4 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-medium md:hidden"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined">tune</span>
          Bộ lọc sản phẩm
        </span>
        <span className="material-symbols-outlined">
          {filtersOpen ? "expand_less" : "expand_more"}
        </span>
      </button>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
        <aside className={`${filtersOpen ? "block" : "hidden"} md:col-span-1 md:block`}>
          <div className="mb-md mt-6">
            <h3 className="font-headline-md text-headline-md mb-2">Filters</h3>
            <div className="bg-surface-container p-md rounded-lg">
              <div className="mb-sm">
                <label className="block font-label-sm mb-2">Search</label>
                <input value={q} onChange={(e)=>setQ(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Name or description" />
              </div>

              <div className="mb-sm">
                <label className="block font-label-sm mb-2">CATEGORY</label>
                <div className="relative" ref={categoryRef}>
                  <button
                    onClick={() => setCategoryOpen((v) => !v)}
                    aria-expanded={categoryOpen}
                    className="w-full text-left px-3 py-2 border rounded-lg flex items-center justify-between"
                  >
                    <span className="truncate">
                      {category
                        ? (categories.find((x) => String(x.id) === String(category))?.name || "Đã chọn")
                        : "Chọn danh mục"}
                    </span>
                    <span className="ml-2">▾</span>
                  </button>

                  {categoryOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white p-2 rounded-lg shadow-lg max-h-56 overflow-auto">
                      <button
                        className={`w-full text-left px-3 py-2 rounded ${category === '' ? 'bg-pink-400 text-white' : ''}`}
                        onClick={() => { setCategory(''); setCategoriesSelected([]); setPage(1); setCategoryOpen(false); }}
                      >
                        Tất cả
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          className={`w-full text-left px-3 py-2 rounded mt-1 ${String(category) === String(c.id) ? 'bg-pink-400 text-white' : ''}`}
                          onClick={() => { setCategory(String(c.id)); setCategoriesSelected([String(c.id)]); setPage(1); setCategoryOpen(false); }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-sm">
                <label className="block font-label-sm mb-2">SIZE</label>
                <div className="flex gap-3 mb-3">
                  {sizeOptions.length > 0 ? (
                    sizeOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSizeSelected((prev) => (prev === opt.value ? "" : opt.value))}
                        className={`w-12 h-12 flex items-center justify-center border rounded-md text-sm font-medium transition-colors ${
                          sizeSelected === opt.value ? "bg-primary text-white border-primary" : "bg-surface-container-lowest text-on-surface"
                        }`}
                      >
                        {opt.value}
                      </button>
                    ))
                  ) : (
                    ['S','M','L','XL'].map((s) => (
                      <button key={s} onClick={() => setSizeSelected((prev) => (prev === s ? "" : s))} className={`w-12 h-12 flex items-center justify-center border rounded-md text-sm font-medium transition-colors ${
                        sizeSelected === s ? "bg-primary text-white border-primary" : "bg-surface-container-lowest text-on-surface"
                      }`}>{s}</button>
                    ))
                  )}
                </div>

                <label className="block font-label-sm mb-2">COLOR</label>
                <div className="flex items-center gap-3 mb-3">
                  {colorOptions.length > 0 ? (
                    colorOptions.map((opt) => {
                      const val = opt.value;
                      // Prefer meta_data hex if provided, then handle common names, then allow hex values directly
                      let bg = '';
                      try {
                        const md = opt.meta_data;
                        if (md) {
                          // meta_data may be an object or JSON string; try to extract a hex color
                          const parsed = typeof md === 'string' ? JSON.parse(md || '{}') : md;
                          bg = parsed.hex || parsed.color || parsed.value || '';
                        }
                      } catch (e) {
                        bg = '';
                      }
                      const colorMap = {
                        white: '#FFFFFF',
                        black: '#000000',
                        blue: '#1F66FF',
                        red: '#FF0000',
                        brown: '#8A3B0A',
                        grey: '#9CA3AF',
                        gray: '#9CA3AF'
                      };
                      if (!bg) {
                        if (/^#/.test(val)) bg = val;
                        else bg = colorMap[val?.toLowerCase()] || '#E5E7EB';
                      }
                      return (
                        <button
                          key={opt.id}
                          aria-label={opt.display_value || val}
                          onClick={() => setColorSelected((prev) => (prev === val ? "" : val))}
                          className={`w-8 h-8 rounded-full border-2 ${colorSelected === val ? 'ring-2 ring-primary' : ''}`}
                          style={{ background: bg }}
                        />
                      );
                    })
                  ) : (
                    ['#1F66FF','#FFFFFF','#0F1724','#8A3B0A'].map(c=> (
                      <button key={c} aria-label={c} onClick={()=> setColorSelected(prev => prev===c ? '' : c)} className={`w-8 h-8 rounded-full border-2 ${colorSelected===c ? 'ring-2 ring-primary' : ''}`} style={{ background: c }} />
                    ))
                  )}
                </div>

                <label className="block font-label-sm mb-2">PRICE</label>
                <div className="mb-2">
                  <input type="range" min="0" max="10000000" step="10000" value={maxPrice || 1000000} onChange={(e)=> setMaxPrice(e.target.value)} className="w-full" />
                  <div className="flex justify-between text-sm mt-2"><span>{minPrice||0}đ</span><span>{(maxPrice||1000000).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ</span></div>
                </div>
              </div>

              <div className="mb-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={inStock} onChange={(e)=>setInStock(e.target.checked)} /> In stock</label>
              </div>

              <div className="flex gap-sm mt-md">
                <button className="bg-primary text-white px-md py-sm rounded-lg" onClick={()=>{ setPage(1); loadProducts(); }}>Apply</button>
                <button className="border px-md py-sm rounded-lg" onClick={()=>{ setQ(''); setCategory(''); setCategoriesSelected([]); setMinPrice(''); setMaxPrice(''); setInStock(false); setSort(''); setSizeSelected(''); setColorSelected(''); setPage(1); loadProducts(); }}>Reset</button>
              </div>
            </div>
          </div>
        </aside>

        <section className="md:col-span-3">
          <div className="mb-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-headline-md">Sản phẩm</h2>
            <div className="flex items-center gap-sm">
              <label className="font-label-sm mr-2">Sort</label>
              <select value={sort} onChange={(e)=>{ const v = e.target.value; setSort(v); setPage(1); loadProducts({ sort: v, page: 1 }); }} className="border rounded-lg px-3 py-2">
                <option value="">Mặc định</option>
                <option value="price_asc">Giá: Thấp → Cao</option>
                <option value="price_desc">Giá: Cao → Thấp</option>
                <option value="newest">Mới nhất</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div>Đang tải...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div>
              {(!products || products.length === 0) ? (
                <div className="py-24 text-center">
                  <p className="text-xl font-medium mb-4">Không tìm thấy sản phẩm phù hợp.</p>
                  <p className="text-sm text-on-surface-variant mb-6">Thử thay đổi bộ lọc hoặc bấm Reset để xem tất cả sản phẩm.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button className="bg-primary text-white px-4 py-2 rounded" onClick={() => { setQ(''); setCategory(''); setCategoriesSelected([]); setMinPrice(''); setMaxPrice(''); setInStock(false); setSort(''); setSizeSelected(''); setColorSelected(''); setPage(1); loadProducts(); }}>Reset bộ lọc</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-gutter mb-lg">
                    {products.map(p=> (
                      <Link key={p.id} to={`/products/${p.id}`} className="group bg-surface-container-lowest border border-outline-variant hover:border-primary transition-all duration-300 rounded-lg overflow-hidden">
                        <div className="relative overflow-hidden aspect-[3/4]">
                          <img alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={p.image} />
                          <button
                            aria-label={p.isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm backdrop-blur transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                              p.isFavorite
                                ? "border-red-500 text-red-600"
                                : "border-white text-gray-700 hover:border-red-400 hover:text-red-500"
                            }`}
                            type="button"
                            disabled={favoriteUpdatingId === p.id}
                            onClick={(event) => handleToggleFavorite(event, p)}
                          >
                            <span
                              className="material-symbols-outlined text-xl"
                              style={{ fontVariationSettings: p.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              favorite
                            </span>
                          </button>
                        </div>
                        <div className="p-sm text-center">
                          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{p.category}</p>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{p.name}</h3>
                    {(() => {
                      const basePrice = Number(p.price ?? p.original_price ?? p.list_price ?? 0);
                      const discountAmount = Number(p.discount_price ?? 0);
                      const currentPrice = getCurrentPrice(basePrice, discountAmount);
                      const hasDiscount = discountAmount > 0 && discountAmount <= basePrice;
                      return hasDiscount ? (
                        <div className="mt-2">
                          <p className="text-on-surface-variant line-through text-sm">{formatCurrency(basePrice)}</p>
                          <p className="font-body-md text-body-md font-bold text-red-500 mt-1">{formatCurrency(currentPrice)}</p>
                        </div>
                      ) : (
                        <p className="font-body-md text-body-md font-bold text-primary mt-2">{formatCurrency(basePrice)}</p>
                      );
                    })()}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-4 mt-10">
                    <nav aria-label="Pagination" className="flex items-center gap-2">
                      <button
                        className="px-md py-sm border rounded-lg"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        &lt;
                      </button>

                      {(() => {
                        const total = pagination?.totalPages ?? pagination?.total_pages ?? (pagination?.totalPages ? pagination.totalPages : null) ?? null;
                        const pages = [];
                        const last = total || 1;
                        const current = page;
                        const pushPage = (n) => pages.push(n);

                        if (!last || last <= 7) {
                          for (let i = 1; i <= last; i++) pushPage(i);
                        } else {
                          pushPage(1);
                          pushPage(2);

                          if (current > 4) pages.push("...");

                          const start = Math.max(3, current - 1);
                          const end = Math.min(last - 2, current + 1);
                          for (let i = start; i <= end; i++) pushPage(i);

                          if (current < last - 3) pages.push("...");

                          pushPage(last - 1);
                          pushPage(last);
                        }

                        return pages.map((pItem, idx) => {
                          if (pItem === "...") return (
                            <span key={`sep-${idx}`} className="px-md py-sm">...</span>
                          );
                          return (
                            <button
                              key={pItem}
                              className={`px-md py-sm border rounded-lg ${pItem === current ? 'bg-primary text-white' : ''}`}
                              onClick={() => setPage(Number(pItem))}
                            >
                              {pItem}
                            </button>
                          );
                        });
                      })()}

                      <button
                        className="px-md py-sm border rounded-lg"
                        disabled={pagination && (page >= (pagination.totalPages ?? pagination.total_pages ?? 1))}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Tiếp
                      </button>
                    </nav>
                    <div className="text-sm text-on-surface-variant">Page {page}{pagination?.totalPages ? ` / ${pagination.totalPages}` : ''}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
