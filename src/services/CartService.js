import api from "../configs/AxiosConfig";

const CartService = {
    async getItems() {
        const response = await api.get("/cart/items");
        return response?.data?.items ?? response?.items ?? [];
    },

    async getItemsCount() {
        const response = await api.get("/cart/items/count");
        return response?.data?.count ?? response?.count ?? 0;
    },

    async addItem(productVariantId, quantity = 1) {
        const response = await api.post("/cart/items", {
            product_variant_id: productVariantId,
            quantity,
        });
        return response?.data ?? response;
    },

    async updateItemQuantity(cartItemId, quantity) {
        const response = await api.put(`/cart/items/${cartItemId}`, {
            quantity,
        });
        return response?.data?.items ?? response?.items ?? [];
    },
};

export default CartService;
