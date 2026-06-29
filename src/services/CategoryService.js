import api from "../configs/AxiosConfig";

const unwrapData = (response) => response?.data ?? response ?? {};

const normalizePagination = (pagination) => {
  if (!pagination) return null;

  return {
    page: Number(pagination.page ?? 1),
    limit: Number(pagination.limit ?? 20),
    totalItems: Number(pagination.totalItems ?? 0),
    totalPages: Number(pagination.totalPages ?? 1),
  };
};

const CategoryService = {
  async getCategories(params = {}) {
    const response = await api.get("/categories", { params });
    const data = unwrapData(response);

    return {
      items: Array.isArray(data.items) ? data.items : [],
      pagination: normalizePagination(data.pagination),
    };
  },

  async getCategory(id) {
    const response = await api.get(`/categories/${id}`);
    return unwrapData(response).items ?? null;
  },

  async createCategory(payload) {
    const response = await api.post("/categories", payload);
    return unwrapData(response).items ?? null;
  },

  async updateCategory(id, payload) {
    const response = await api.put(`/categories/${id}`, payload);
    return unwrapData(response).items ?? null;
  },

  async deleteCategory(id) {
    await api.delete(`/categories/${id}`);
    return true;
  },
};

export default CategoryService;
