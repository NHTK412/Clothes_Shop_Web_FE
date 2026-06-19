import api from "../configs/AxiosConfig";

const CartService = {
    async getItemsCount() {
        const response = await api.get("/cart/items/count");
        return response?.data?.count ?? response?.count ?? 0;
    },
};

export default CartService;
