import api from "../configs/AxiosConfig";

const resolvePayload = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
        return { items: payload, pagination: null };
    }

    if (Array.isArray(payload?.data)) {
        return {
            items: payload.data,
            pagination: payload.pagination ?? null,
        };
    }

    if (Array.isArray(payload?.items)) {
        return {
            items: payload.items,
            pagination: payload.pagination ?? null,
        };
    }

    if (Array.isArray(payload?.data?.items)) {
        return {
            items: payload.data.items,
            pagination: payload.data.pagination ?? null,
        };
    }

    if (Array.isArray(payload?.data?.data)) {
        return {
            items: payload.data.data,
            pagination: payload.data.pagination ?? null,
        };
    }

    return { items: [], pagination: null };
};

const OrderService = {
    // Customer: danh sách đơn hàng
    async getOrders({ page = 1, perPage = 10, status } = {}) {
        const response = await api.get("/order", {
            params: {
                page,
                per_page: perPage,
                status: status && status !== "ALL" ? status : undefined,
            },
        });

        return resolvePayload(response);
    },

    // Customer: chi tiết đơn hàng
    async getOrderDetail(orderId) {
        if (!orderId) return null;

        const response = await api.get(`/order/${orderId}`);
        return response?.data ?? response;
    },

    // Customer: hủy đơn
    async cancelOrder(orderId) {
        if (!orderId) return null;

        const response = await api.patch(`/order/${orderId}/cancel`);
        return response?.data ?? response;
    },

    // Customer: đánh giá một order detail
    async reviewOrderDetail(orderId, orderDetailId, payload) {
        if (!orderId || !orderDetailId) return null;

        const response = await api.post(
            `/order/${orderId}/${orderDetailId}/review`,
            payload,
        );

        return response?.data ?? response;
    },

    // Customer: theo dõi vận chuyển GHN
    async getGhnTracking(orderCode) {
        if (!orderCode) return [];

        const response = await api.get("/ghn/detail", {
            params: { order_code: orderCode },
        });

        return response?.data ?? response ?? [];
    },

    // Customer: tạo đơn
    async createOrder(payload) {
        const response = await api.post("/order", payload);
        return response?.data ?? response;
    },

    // Customer: tạo URL thanh toán VNPAY
    async createVnpayPaymentUrl(payload) {
        const response = await api.post("/vnpay/payment-url", payload);
        return response?.data ?? response;
    },

    // Admin: danh sách toàn bộ đơn hàng
    async getAdminOrders(params = {}) {
        const response = await api.get("/admin/orders", { params });
        return resolvePayload(response);
    },

    // Admin: đơn hàng của một khách hàng
    async getAdminCustomerOrders(customerId, params = {}) {
        if (!customerId) {
            return { items: [], pagination: null };
        }

        const response = await api.get(
            `/admin/customers/${customerId}/orders`,
            { params },
        );

        return resolvePayload(response);
    },

    // Admin: chi tiết một đơn
    async getAdminOrder(id) {
        if (!id) return null;

        const response = await api.get(`/admin/orders/${id}`);
        return response?.data ?? response;
    },

    // Admin: thống kê đơn hàng
    async getAdminOrdersSummary(params = {}) {
        const response = await api.get("/admin/orders/summary", { params });
        return response?.data ?? response;
    },
};

export default OrderService;