import api from "../configs/AxiosConfig";

const unwrapData = (response) => response?.data ?? response;

const VoucherService = {
    async getVouchers(params = {}) {
        const response = await api.get("/voucher", { params });
        const payload = unwrapData(response) ?? {};

        return {
            items: Array.isArray(payload.items) ? payload.items : [],
            pagination: payload.pagination ?? null,
        };
    },

    async getVoucherByCode(code) {
        const response = await api.get(`/voucher/${code}`);
        return unwrapData(response);
    },

    async createVoucher(payload) {
        const response = await api.post("/voucher", payload);
        return unwrapData(response);
    },

    async updateVoucher(voucher, payload) {
        const response = await api.put(`/voucher/${voucher}`, payload);
        return unwrapData(response);
    },

};

export default VoucherService;
