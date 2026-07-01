import api from "../configs/AxiosConfig";

const resolveBanner = (response) => response?.data ?? response ?? null;

const BannerService = {
  async getBanners() {
    const response = await api.get("/banners");
    const payload = response?.data ?? response ?? {};

    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      pagination: payload?.pagination ?? null,
    };
  },

  async getBanner(id) {
    if (!id) return null;
    const response = await api.get(`/banners/${id}`);
    return resolveBanner(response);
  },

  async createBanner(payload) {
    const response = await api.post("/admin/banners", payload);
    return resolveBanner(response);
  },

  async updateBanner(id, payload) {
    if (!id) return null;
    const response = await api.patch(`/admin/banners/${id}`, payload);
    return resolveBanner(response);
  },

  async deleteBanner(id) {
    if (!id) return null;
    const response = await api.delete(`/admin/banners/${id}`);
    return resolveBanner(response);
  },
};

export default BannerService;
