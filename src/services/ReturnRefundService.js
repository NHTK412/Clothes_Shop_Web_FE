import api from "../configs/AxiosConfig";

const resolveList = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
        return { items: payload, pagination: null };
    }

    return {
        items: Array.isArray(payload?.items) ? payload.items : [],
        pagination: payload?.pagination ?? null,
    };
};

const compactParams = (params = {}) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) =>
            value !== undefined && value !== null && value !== ""),
    );

const ReturnRefundService = {
    async createReturnRequest(orderId, reason) {
        if (!orderId) return null;
        const response = await api.post("/return-requests", {
            order_id: orderId,
            reason,
        });
        return response?.data ?? response;
    },

    async getReturnRequests(params = {}) {
        const response = await api.get("/return-requests", {
            params: compactParams(params),
        });
        return resolveList(response);
    },

    async cancelReturnRequest(id) {
        if (!id) return null;
        const response = await api.patch(`/return-requests/${id}/cancel`);
        return response?.data ?? response;
    },

    async getAdminReturnRequests(params = {}) {
        const response = await api.get("/admin/return-requests", {
            params: compactParams(params),
        });
        return resolveList(response);
    },

    async getAdminReturnRequest(id) {
        if (!id) return null;
        const response = await api.get(`/admin/return-requests/${id}`);
        return response?.data ?? response;
    },

    async updateAdminReturnRequestStatus(id, payload) {
        if (!id) return null;
        const response = await api.patch(
            `/admin/return-requests/${id}/status`,
            payload,
        );
        return response?.data ?? response;
    },

    async getAdminRefunds(params = {}) {
        const response = await api.get("/admin/refunds", {
            params: compactParams(params),
        });
        return resolveList(response);
    },

    async updateAdminRefund(id, payload) {
        if (!id) return null;
        const response = await api.patch(`/admin/refunds/${id}`, payload);
        return response?.data ?? response;
    },

    async updateAdminRefundStatus(id, status) {
        if (!id) return null;
        const response = await api.patch(`/admin/refunds/${id}/status`, {
            status,
        });
        return response?.data ?? response;
    },
};

export default ReturnRefundService;
