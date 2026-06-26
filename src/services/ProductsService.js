/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import api from "../configs/AxiosConfig";

// derive backend origin from Axios baseURL (strip trailing /api)
const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

const fallbackCategories = [
  { id: 1, name: "Thá»i trang Ná»¯", image: "https://picsum.photos/seed/cat-1/1200/800" },
  { id: 2, name: "Thá»i trang Nam", image: "https://picsum.photos/seed/cat-2/1200/800" },
  { id: 3, name: "Phá»¥ kiá»‡n", image: "https://picsum.photos/seed/cat-3/1200/800" },
];

const fallbackProducts = [
  { id: 1, name: "Sáº£n pháº©m máº«u 1", category: "Máº«u", price: 100000, priceDisplay: "100.000Ä‘", image: "https://picsum.photos/seed/sample-1/800/1000" },
  { id: 2, name: "Sáº£n pháº©m máº«u 2", category: "Máº«u", price: 200000, priceDisplay: "200.000Ä‘", image: "https://picsum.photos/seed/sample-2/800/1000" },
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const getPricing = (item = {}) => {
  const firstVariant = Array.isArray(item.variants)
    ? item.variants[0]
    : Array.isArray(item.product_variants)
      ? item.product_variants[0]
      : null;

  const originalPrice = Number(
    item.price ??
      item.unit_price ??
      item.original_price ??
      item.regular_price ??
      item.list_price ??
      firstVariant?.price ??
      firstVariant?.unit_price ??
      firstVariant?.original_price ??
      0
  );
  const discountAmount = Number(
    item.discount_price ??
      item.unit_discount_price ??
      firstVariant?.discount_price ??
      firstVariant?.unit_discount_price ??
      0
  );
  const finalPrice = Math.max(originalPrice - discountAmount, 0);

  return {
    originalPrice,
    discountAmount,
    price: finalPrice,
    priceDisplay: item.priceDisplay ?? formatCurrency(finalPrice),
  };
};

const getFavoriteState = (item = {}) => Boolean(
  item.is_favorite ??
    item.isFavorite ??
    item.favorited ??
    item.is_liked ??
    item.favorite_id ??
    item.favorite
);

const getProductId = (item = {}) => item.product_id ?? item.productId ?? item.id ?? item.product?.id ?? null;

const normalizeFavoriteItems = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.items ?? payload?.favorites ?? payload?.results ?? [];

  return Array.isArray(list) ? list : [];
};

const getFavoriteProductIds = (payload) => new Set(
  normalizeFavoriteItems(payload)
    .map(getProductId)
    .filter((id) => id !== null && id !== undefined)
    .map((id) => String(id))
);

const ProductsService = {
  async getCategories() {
    try {
      const res = await api.get("/categories");
      // Normalize to an array. Backend formats vary: array | { data: [] } | { results: [] }
      const list = res?.data || res;
      if (Array.isArray(list)) return list;
      if (list && Array.isArray(list.data)) return list.data;
      if (list && Array.isArray(list.items)) return list.items;
      if (list && Array.isArray(list.results)) return list.results;
      return fallbackCategories;
    } catch (e) {
      return fallbackCategories;
    }
  },

  async getAttributes() {
    try {
      const res = await api.get("/attributes");
      const payload = res?.data ?? res;
      // payload may be an array of attributes or { data: [...] }
      const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.results ?? [];
      return list;
    } catch (e) {
      return [];
    }
  },

  // Generic products fetch with filters and pagination
  async getProducts(params = {}) {
    try {
      const res = await api.get("/products", { params });
      const payload = res?.data || res;
      // find items and pagination
      const itemsRaw = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.items ?? payload?.results ?? [];

      const pagination = payload?.pagination || payload?.meta || null;

      const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map((p) => {
        const id = p.id ?? p._id ?? p.productId ?? null;
        const name = p.name ?? p.title ?? p.productName ?? "Untitled";
        let image = p.image ?? p.thumbnail ?? (Array.isArray(p.images) && p.images[0]) ?? p.avatar ?? (Array.isArray(p.variants) && p.variants[0]?.image) ?? "";
        const pricing = getPricing(p);
        const shortDescription = p.shortDescription ?? p.excerpt ?? p.summary ?? "";
        const description = p.description ?? p.longDescription ?? "";
        const category = typeof p.category === "string" ? p.category : p.category?.name ?? (Array.isArray(p.categories) && p.categories[0]?.name) ?? p.category?.title ?? "";
        if (!image) {
          image = id ? `https://picsum.photos/seed/product-${id}/800/1000` : "https://picsum.photos/800/1000";
        } else if (image && !/^https?:\/\//i.test(image)) {
          // relative path from API - resolve against backend origin
          image = `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
        }
        return {
          id,
          name,
          image,
          category,
          ...pricing,
          shortDescription,
          description,
          isFavorite: getFavoriteState(p),
          created_at: p.created_at ?? p.createdAt ?? null,
        };
      });

      // Do NOT return fallbackProducts when the backend explicitly returns no items.
      // Return an empty array so the UI can show a proper "no results" message.
      return { items: items, pagination };
    } catch (e) {
      return { items: fallbackProducts, pagination: null };
    }
  },

  async getFeaturedProducts() {
    try {
      const res = await api.get("/products?featured=true&limit=8");
      const list = res?.data || res;
      let items = [];
      if (Array.isArray(list)) items = list;
      else if (list && Array.isArray(list.data)) items = list.data;
      else if (list && Array.isArray(list.items)) items = list.items;
      else if (list && Array.isArray(list.results)) items = list.results;
      else return fallbackProducts;

      // Normalize each product to the UI-friendly shape
      const normalized = items.map((p) => {
        const id = p.id ?? p._id ?? p.productId ?? null;
        const name = p.name ?? p.title ?? p.productName ?? "Untitled";
        let image =
          p.image ??
          p.thumbnail ??
          (Array.isArray(p.images) && p.images[0]) ??
          p.avatar ??
          (Array.isArray(p.variants) && p.variants[0]?.image) ??
          "";

        const pricing = getPricing(p);
        const shortDescription = p.shortDescription ?? p.excerpt ?? p.summary ?? "";
        const description = p.description ?? p.longDescription ?? "";
        // category can be an object or array from backend
        const category =
          typeof p.category === "string"
            ? p.category
            : p.category?.name ?? (Array.isArray(p.categories) && p.categories[0]?.name) ?? p.category?.title ?? "";
        // Provide a visible fallback image when backend has no image
        if (!image) {
          image = id ? `https://picsum.photos/seed/product-${id}/800/1000` : "https://picsum.photos/800/1000";
        } else if (image && !/^https?:\/\//i.test(image)) {
          image = `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
        }
        return {
          id,
          name,
          image,
          category,
          ...pricing,
          shortDescription,
          description,
          isFavorite: getFavoriteState(p),
        };
      });

      // If normalization produced no items, fall back to built-in list
      if (!normalized || normalized.length === 0) return fallbackProducts;

      // Debug: help verify what the UI will receive (appears in browser console)
      try {
        // eslint-disable-next-line no-console
        console.debug("ProductsService.getFeaturedProducts normalized:", normalized);
      } catch (e) {}

      return normalized;
    } catch (e) {
      return fallbackProducts;
    }
  },

  async getProduct(id) {
    if (!id) return null;
    try {
      const res = await api.get(`/products/${id}`);
      const payload = res?.data || res;

      // support shapes: { data: { items: {...} } } or { data: {...} } or { items: {...} }
      let raw = null;
      if (payload && payload.data) {
        const d = payload.data;
        raw = d.items ?? d.item ?? d;
      } else if (payload && payload.items) {
        raw = payload.items;
      } else {
        raw = payload;
      }

      // If raw is an object with product fields, normalize similar to other methods
      const p = raw || null;
      if (!p) return null;

      const idVal = p.id ?? p._id ?? p.productId ?? null;
      const name = p.name ?? p.title ?? p.productName ?? "Untitled";
      let image = p.image ?? p.thumbnail ?? (Array.isArray(p.images) && p.images[0]) ?? p.avatar ?? (Array.isArray(p.variants) && p.variants[0]?.image) ?? "";
      const pricing = getPricing(p);
      const description = p.description ?? p.longDescription ?? p.summary ?? "";
      const rawVariants = Array.isArray(p.variants) ? p.variants : (p.product_variants && Array.isArray(p.product_variants) ? p.product_variants : []);
      const variants = (Array.isArray(rawVariants) ? rawVariants : []).map((v) => {
        const vImage = v.image ?? v.thumbnail ?? "";
        const resolvedImage = vImage && !/^https?:\/\//i.test(vImage) ? `${BACKEND_ORIGIN}/${String(vImage).replace(/^\/+/, "")}` : (vImage || null);
        return { ...v, image: resolvedImage };
      });
      const categories = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);

      if (!image) {
        image = idVal ? `https://picsum.photos/seed/product-${idVal}/800/1000` : "https://picsum.photos/800/1000";
      } else if (image && !/^https?:\/\//i.test(image)) {
        image = `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
      }

      return {
        id: idVal,
        name,
        image,
        ...pricing,
        description,
        variants,
        categories,
        isFavorite: getFavoriteState(p),
        created_at: p.created_at ?? p.createdAt ?? null,
      };
    } catch (e) {
      return null;
    }
  },

  async addFavorite(productId) {
    const response = await api.post(`/products/${productId}/favorites`);
    return response?.data ?? response;
  },

  async removeFavorite(productId) {
    const response = await api.delete(`/products/${productId}/favorites`);
    return response?.data ?? response;
  },

  async getUserFavorites(userId) {
    if (!userId) return [];

    const response = await api.get(`/users/${userId}/favorites`);
    return normalizeFavoriteItems(response?.data ?? response);
  },

  getFavoriteProductIds,
};

export default ProductsService;

