import api from "../configs/AxiosConfig";

const OrderService = {
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
