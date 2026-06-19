import api from "../configs/AxiosConfig";

const getItems = (response) => response?.data?.items ?? response?.items ?? [];

const AddressService = {
    async getAddresses() {
        const response = await api.get("/addresses");
        return getItems(response);
    },

    async createAddress(payload) {
        const response = await api.post("/addresses", payload);
        return response?.data ?? response;
    },

    async updateAddress(addressId, payload) {
        const response = await api.put(`/addresses/${addressId}`, payload);
        return response?.data ?? response;
    },

    async deleteAddress(addressId) {
        const response = await api.delete(`/addresses/${addressId}`);
        return response?.data ?? response;
    },

    async setDefaultAddress(addressId) {
        const response = await api.put(`/addresses/${addressId}/default`);
        return response?.data ?? response;
    },

    async getProvinces() {
        const response = await api.get("/ghn/provinces");
        return getItems(response);
    },

    async getDistricts(provinceId) {
        if (!provinceId) return [];
        const response = await api.get("/ghn/districts", {
            params: { province_id: provinceId },
        });
        return getItems(response);
    },

    async getWards(districtId) {
        if (!districtId) return [];
        const response = await api.get("/ghn/wards", {
            params: { district_id: districtId },
        });
        return getItems(response);
    },

    async getShippingFee(toWardCode, toDistrictId) {
        if (!toWardCode || !toDistrictId) return 0;

        const response = await api.get("/ghn/shipping-fee", {
            params: {
                to_ward_code: toWardCode,
                to_district_id: toDistrictId,
            },
        });

        return Number(response?.data?.total ?? response?.total ?? 0);
    },
};

export default AddressService;
