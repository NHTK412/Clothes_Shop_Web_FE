import api from "../configs/AxiosConfig";
import CategoryService from "./CategoryService";

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

// Kept for product normalizers that can opt into the shared pricing shape.
// eslint-disable-next-line no-unused-vars
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

const normalizeProductListParams = (params = {}) => {
  const normalized = {};
  const sortMap = {
    price_asc: "price",
    price_desc: "-price",
    newest: "-created_at",
    oldest: "created_at",
  };

  if (params.per_page !== undefined) normalized.per_page = Number(params.per_page);
  if (params.page !== undefined) normalized.page = Number(params.page);
  if (params.sort) normalized.sort = sortMap[params.sort] ?? params.sort;
  if (params.category !== undefined && params.category !== "") {
    normalized.category = String(params.category);
  }
  if (params.q) normalized.q = String(params.q).trim();
  if (params.min_price !== undefined && params.min_price !== "") {
    normalized.min_price = Number(params.min_price);
  }
  if (params.max_price !== undefined && params.max_price !== "") {
    normalized.max_price = Number(params.max_price);
  }
  if (params.in_stock) normalized.in_stock = true;
  if (params.promotionId !== undefined && params.promotionId !== "") {
    normalized.promotionId = Number(params.promotionId);
  }

  const attributeValueIds = Array.isArray(params.attribute_value_ids)
    ? params.attribute_value_ids
    : String(params.attribute_value_ids ?? "")
        .split(",")
        .filter(Boolean);
  const validAttributeValueIds = [
    ...new Set(
      attributeValueIds
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  if (validAttributeValueIds.length > 0) {
    normalized.attribute_value_ids = validAttributeValueIds.join(",");
  }

  if (params.attr && typeof params.attr === "object") {
    Object.entries(params.attr).forEach(([name, values]) => {
      const value = Array.isArray(values) ? values.join(",") : String(values ?? "");
      if (value) normalized[`attr[${name}]`] = value;
    });
  }
  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("attr[") && value !== "" && value !== undefined) {
      normalized[key] = Array.isArray(value) ? value.join(",") : String(value);
    }
  });

  return normalized;
};

const ProductsService = {
  async getCategories(params = {}) {
    try {
      const result = await CategoryService.getCategories(params);
      return result.items;
    } catch {
      return fallbackCategories;
    }
  },

  async createCategory(data) {
      return CategoryService.createCategory(data);
  },

  async updateCategory(id, data) {
      return CategoryService.updateCategory(id, data);
  },

  async deleteCategory(id) {
      return CategoryService.deleteCategory(id);
  },

  async getAttributes() {
    try {
      const res = await api.get("/attributes");
      const payload = res?.data ?? res;
      // payload may be an array of attributes or { data: [...] }
      const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.results ?? [];
      return list;
    } catch {
      return [];
    }
  },

  // Generic products fetch with filters and pagination
  async getProducts(params = {}) {
      const query = normalizeProductListParams(params);
      const res = await api.get("/products", { params: query });
      const payload = res?.data ?? res ?? {};
      // find items and pagination
      const itemsRaw = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.data?.items ?? payload?.results ?? [];

      const pagination = payload?.pagination ?? payload?.data?.pagination ?? payload?.meta ?? null;

      const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map((p) => {
        const id = p.id ?? p._id ?? p.productId ?? null;
        const name = p.name ?? p.title ?? p.productName ?? "Untitled";
        let image = p.image ?? p.thumbnail ?? (Array.isArray(p.images) && p.images[0]) ?? p.avatar ?? (Array.isArray(p.variants) && p.variants[0]?.image) ?? "";
        const rawBasePrice = p.price ?? p.unitPrice ?? p.priceAmount ?? p.original_price ?? p.regular_price ?? null;
        const rawDiscountPrice = p.discount_price ?? null;
        const rawSalePrice = p.sale_price ?? null;
        const basePrice = rawBasePrice != null && !isNaN(Number(rawBasePrice)) ? Number(rawBasePrice) : null;
        const discountAmount = rawDiscountPrice != null && !isNaN(Number(rawDiscountPrice)) ? Number(rawDiscountPrice) : null;
        const salePrice = rawSalePrice != null && !isNaN(Number(rawSalePrice)) ? Number(rawSalePrice) : null;
        const normalizedDiscount = salePrice != null && basePrice != null ? Math.max(basePrice - salePrice, 0) : discountAmount;
        const finalPrice = salePrice != null ? salePrice : (basePrice != null && normalizedDiscount != null ? Math.max(basePrice - normalizedDiscount, 0) : null);
        const price = basePrice ?? finalPrice ?? null;
        const priceDisplay = p.priceDisplay ?? (finalPrice != null ? Number(finalPrice).toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
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
          price,
          discount_price: normalizedDiscount,
          priceDisplay,
          shortDescription,
          description,
          stock: p.stock ?? p.available_stock ?? p.quantity ?? p.qty ?? p.inventory ?? null,
          status: p.status ?? p.state ?? null,
          variants: Array.isArray(p.variants) ? p.variants : [],
          created_at: p.created_at ?? p.createdAt ?? null,
          isFavorite: getFavoriteState(p),
        };
      });

      // Do NOT return fallbackProducts when the backend explicitly returns no items.
      // Return an empty array so the UI can show a proper "no results" message.
      return { items: items, pagination };
  },

  async getAllProducts(params = {}) {
    const result = await this.getProducts(params);
    return {
      success: true,
      data: result,
      status: 200,
    };
  },

  async getProductById(id) {
    return this.getProduct(id);
  },

  async createProduct(data) {
    try {
      const response = await api.post("/products", data);
      const payload = response?.data?.data ?? response?.data ?? response;
      return {
        success: true,
        data: payload,
        status: response?.status ?? 201,
      };
    } catch (error) {
      console.error('ProductsService.createProduct error:', error.response?.data || error.message);
      throw error;
    }
  },

  async updateProduct(id, data) {
    const response = await api.put(`/products/${id}`, data);
    const payload = response?.data?.data ?? response?.data ?? response;
    return {
      success: true,
      data: payload,
      status: response?.status ?? 200,
    };
  },

  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}`);
    return {
      success: true,
      data: response?.data?.data ?? response?.data ?? null,
      status: response?.status ?? 200,
    };
  },

  async uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    const payload = response?.data?.data ?? response?.data ?? response;
    return {
      success: true,
      data: payload,
      status: response?.status ?? 200,
    };
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

        const rawBasePrice = p.price ?? p.unitPrice ?? p.priceAmount ?? p.original_price ?? p.regular_price ?? null;
        const rawDiscountPrice = p.discount_price ?? null;
        const rawSalePrice = p.sale_price ?? null;
        const basePrice = rawBasePrice != null && !isNaN(Number(rawBasePrice)) ? Number(rawBasePrice) : null;
        const discountAmount = rawDiscountPrice != null && !isNaN(Number(rawDiscountPrice)) ? Number(rawDiscountPrice) : null;
        const salePrice = rawSalePrice != null && !isNaN(Number(rawSalePrice)) ? Number(rawSalePrice) : null;
        const normalizedDiscount = salePrice != null && basePrice != null ? Math.max(basePrice - salePrice, 0) : discountAmount;
        const finalPrice = salePrice != null ? salePrice : (basePrice != null && normalizedDiscount != null ? Math.max(basePrice - normalizedDiscount, 0) : null);
        const price = basePrice ?? finalPrice ?? null;
        const priceDisplay = p.priceDisplay ?? (finalPrice != null ? Number(finalPrice).toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
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
          discount_price: normalizedDiscount,
          priceDisplay,
          shortDescription,
          description,
          isFavorite: getFavoriteState(p),
        };
      });

      // If normalization produced no items, fall back to built-in list
      if (!normalized || normalized.length === 0) return fallbackProducts;

      return normalized;
    } catch {
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
      const rawBasePrice = p.price ?? p.unitPrice ?? p.priceAmount ?? p.original_price ?? p.regular_price ?? null;
      const rawDiscountPrice = p.discount_price ?? null;
      const rawSalePrice = p.sale_price ?? null;
      const basePrice = rawBasePrice != null && !isNaN(Number(rawBasePrice)) ? Number(rawBasePrice) : null;
      const discountAmount = rawDiscountPrice != null && !isNaN(Number(rawDiscountPrice)) ? Number(rawDiscountPrice) : null;
      const salePrice = rawSalePrice != null && !isNaN(Number(rawSalePrice)) ? Number(rawSalePrice) : null;
      const normalizedDiscount = salePrice != null && basePrice != null ? Math.max(basePrice - salePrice, 0) : discountAmount;
      const finalPrice = salePrice != null ? salePrice : (basePrice != null && normalizedDiscount != null ? Math.max(basePrice - normalizedDiscount, 0) : null);
      const price = basePrice ?? finalPrice ?? null;
      const priceDisplay = p.priceDisplay ?? (finalPrice != null ? Number(finalPrice).toLocaleString("vi-VN") + "đ" : p.displayPrice ?? "");
      const description = p.description ?? p.longDescription ?? p.summary ?? "";
      const rawVariants = Array.isArray(p.variants) ? p.variants : (p.product_variants && Array.isArray(p.product_variants) ? p.product_variants : []);
      const variants = (Array.isArray(rawVariants) ? rawVariants : []).map((v) => {
        const normalizeNumber = (value) => {
          if (value === "" || value === null || value === undefined) return null;
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        };

        const rawVariantBase = v.price ?? v.unitPrice ?? v.priceAmount ?? v.original_price ?? v.regular_price ?? v.list_price ?? null;
        const rawVariantDiscount = v.discount_price ?? null;
        const rawVariantSale = v.sale_price ?? null;
        const variantBasePrice = normalizeNumber(rawVariantBase);
        const variantDiscountPrice = normalizeNumber(rawVariantDiscount);
        const variantSalePrice = normalizeNumber(rawVariantSale);
        const variantNormalizedDiscount =
          variantSalePrice != null && variantBasePrice != null
            ? Math.max(variantBasePrice - variantSalePrice, 0)
            : variantDiscountPrice;
        const variantFinalPrice =
          variantSalePrice != null
            ? variantSalePrice
            : variantBasePrice != null && variantNormalizedDiscount != null
            ? Math.max(variantBasePrice - variantNormalizedDiscount, 0)
            : null;

        const vImage = v.image ?? v.thumbnail ?? "";
        const resolvedImage = vImage && !/^https?:\/\//i.test(vImage) ? `${BACKEND_ORIGIN}/${String(vImage).replace(/^\/+/, "")}` : (vImage || null);
        return {
          ...v,
          image: resolvedImage,
          price: variantBasePrice ?? variantFinalPrice,
          discount_price: variantNormalizedDiscount,
          sale_price: variantSalePrice,
        };
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
        discount_price: normalizedDiscount,
        priceDisplay,
        description,
        variants,
        categories,
        status: p.status ?? p.state ?? 'active',
        created_at: p.created_at ?? p.createdAt ?? null,
      };
    } catch {
      return null;
    }
  },

  async getProductReviews(productId, params = {}) {
    if (!productId) {
      return {
        items: [],
        pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
      };
    }

    const response = await api.get(`/products/${productId}/reviews`, {
      params: {
        rating: params.rating || undefined,
        has_images:
          params.has_images === true || params.has_images === 1 || params.has_images === "1"
            ? 1
            : params.has_images === false || params.has_images === 0 || params.has_images === "0"
              ? 0
              : undefined,
        sort: params.sort || "newest",
        page: params.page || 1,
        per_page: params.per_page || 10,
      },
    });
    const payload = response?.data ?? response ?? {};

    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      pagination: payload?.pagination ?? {
        current_page: 1,
        per_page: Number(params.per_page || 10),
        total: 0,
        last_page: 1,
      },
    };
  },

  async getProductReviewsSummary(productId) {
    if (!productId) return null;
    const response = await api.get(`/products/${productId}/reviews/summary`);
    return response?.data ?? response;
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
