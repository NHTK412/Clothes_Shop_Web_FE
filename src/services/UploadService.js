import api from "../configs/AxiosConfig";

const UploadService = {
    async uploadImage(file) {
        const formData = new FormData();
        formData.append("image", file);

        const response = await api.post("/upload", formData);

        return response?.data ?? response;
    },
};

export default UploadService;
