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

export {
    login,
    register
}