import api from "../configs/AxiosConfig";

const VoucherService = {
    async getVoucherByCode(code) {
        const response = await api.get(`/voucher/${code}`);
        return response?.data ?? response;
    }
};

export default VoucherService;