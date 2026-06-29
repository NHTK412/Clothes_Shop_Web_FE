import api from "../configs/AxiosConfig";

const ProfileService = {
    async getProfile() {
        const response = await api.get("/profile");
        return response?.data ?? response;
    },

    async updateProfile(payload) {
        const response = await api.put("/profile", payload);
        return response?.data ?? response;
    },

    async updatePartialProfile(payload) {
        const response = await api.patch("/profile", payload);
        return response?.data ?? response;
    },

    async deleteProfile() {
        const response = await api.delete("/profile");
        return response?.data ?? response;
    },
};

export default ProfileService;
