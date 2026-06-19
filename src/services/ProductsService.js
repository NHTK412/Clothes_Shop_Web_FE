/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import api from "../configs/AxiosConfig";

// derive backend origin from Axios baseURL (strip trailing /api)
const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

const fallbackCategories = [
  { id: 1, name: "Thời trang Nữ", image: "https://picsum.photos/seed/cat-1/1200/800" },
  { id: 2, name: "Thời trang Nam", image: "https://picsum.photos/seed/cat-2/1200/800" },
  { id: 3, name: "Phụ kiện", image: "https://picsum.photos/seed/cat-3/1200/800" },
];

const fallbackProducts = [
  { id: 1, name: "Sản phẩm mẫu 1", category: "Mẫu", price: 100000, priceDisplay: "100.000đ", image: "https://picsum.photos/seed/sample-1/800/1000" },
  { id: 2, name: "Sản phẩm mẫu 2", category: "Mẫu", price: 200000, priceDisplay: "200.000đ", image: "https://picsum.photos/seed/sample-2/800/1000" },
];

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
        const rawPrice = (p.discount_price ?? p.price ?? p.unitPrice ?? p.priceAmount ?? null);
        const priceNum = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
        const price = priceNum ?? null;
        const priceDisplay = p.priceDisplay ?? (priceNum !== null ? priceNum.toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
        const shortDescription = p.shortDescription ?? p.excerpt ?? p.summary ?? "";
        const description = p.description ?? p.longDescription ?? "";
        const category = typeof p.category === "string" ? p.category : p.category?.name ?? (Array.isArray(p.categories) && p.categories[0]?.name) ?? p.category?.title ?? "";
        if (!image) {
          image = id ? `https://picsum.photos/seed/product-${id}/800/1000` : "https://picsum.photos/800/1000";
        } else if (image && !/^https?:\/\//i.test(image)) {
          // relative path from API - resolve against backend origin
          image = `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
        }
        return { id, name, image, category, price, priceDisplay, shortDescription, description, created_at: p.created_at ?? p.createdAt ?? null };
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

        // Prefer discount_price when available
        const rawPrice = (p.discount_price ?? p.price ?? p.unitPrice ?? p.priceAmount ?? null);
        const priceNum = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
        const price = priceNum ?? null;
        const priceDisplay = p.priceDisplay ?? (priceNum !== null ? priceNum.toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
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
          price,
          priceDisplay,
          shortDescription,
          description,
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
      const rawPrice = (p.discount_price ?? p.price ?? p.unitPrice ?? p.priceAmount ?? null);
      const priceNum = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
      const price = priceNum ?? null;
      const priceDisplay = p.priceDisplay ?? (priceNum !== null ? priceNum.toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
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
        price,
        priceDisplay,
        description,
        variants,
        categories,
        created_at: p.created_at ?? p.createdAt ?? null,
      };
    } catch (e) {
      return null;
    }
  },
};

export default ProductsService;
