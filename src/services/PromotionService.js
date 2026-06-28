import api from "../configs/AxiosConfig";

const unwrapData = (response) => response?.data ?? response;

const PromotionService = {
  async getPromotions(params = {}) {
    const response = await api.get("/promotion", { params });
    const payload = unwrapData(response) ?? {};

    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      pagination: payload.pagination ?? null,
    };
  },

  async getCurrentPromotion() {
    const response = await api.get("/promotion/first");
    return unwrapData(response);
  },

  async createPromotion(payload) {
    const response = await api.post("/promotion", payload);
    return unwrapData(response);
  },

  async updatePromotion(id, payload) {
    const response = await api.put(`/promotion/${id}`, payload);
    return unwrapData(response);
  },

  async deactivatePromotion(id) {
    const response = await api.delete(`/promotion/${id}`);
    return unwrapData(response);
  },
};

export default PromotionService;
