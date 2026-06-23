import api from "../configs/AxiosConfig";

const OrderService = {
    async getOrders({ page = 1, perPage = 10, status } = {}) {
        const response = await api.get("/order", {
            params: {
                page,
                per_page: perPage,
                status: status && status !== "ALL" ? status : undefined,
            },
        });

        return response?.data ?? response;
    },

    async getOrderDetail(orderId) {
        const response = await api.get(`/order/${orderId}`);
        return response?.data ?? response;
    },

    async createOrder(payload) {
        const response = await api.post("/order", payload);
        return response?.data ?? response;
    },

    async createVnpayPaymentUrl(payload) {
        const response = await api.post("/vnpay/payment-url", payload);
        return response?.data ?? response;
    },
};

export default OrderService;
