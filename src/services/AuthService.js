import axios from "../configs/AxiosConfig";

const login = async (loginData) => {
    try {
        const response = await axios.post("/auth/login", loginData);
        return response.data;
    }
    catch (error) {
        throw error;
    }
};

const register = async (registerData) => {
    try {
        const response = await axios.post("/auth/register", registerData);
        return response.data;
    }
    catch (error) {
        throw error;
    }
};

const sendOtp = async (email) => {
    try {
        const response = await axios.post("/auth/send-reset-link", { email });
        return response.data;
    }
    catch (error) {
        throw error;
    }
};

const resetPassword = async (resetData) => {
    try {
        const response = await axios.post("/auth/reset-password", resetData);
        return response.data;
    }
    catch (error) {
        throw error;
    }
};

export {
    login,
    register,
    sendOtp,
    resetPassword
}