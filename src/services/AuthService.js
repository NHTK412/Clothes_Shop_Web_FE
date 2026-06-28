/* eslint-disable no-useless-catch */
import axios from "../configs/AxiosConfig";

const normalizeRole = (value) => {
    if (!value) return "ROLE_CUSTOMER";
    if (Array.isArray(value)) {
        const firstRole = value.find(Boolean);
        return normalizeRole(firstRole);
    }
    if (typeof value === "string") {
        const upper = value.trim().toUpperCase();
        if (["ROLE_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(upper)) {
            return "ROLE_ADMIN";
        }
        if (["ROLE_CUSTOMER", "CUSTOMER", "USER"].includes(upper)) {
            return "ROLE_CUSTOMER";
        }
        return upper;
    }
    return "ROLE_CUSTOMER";
};

const normalizeAuthResponse = (response) => {
    const payload = response?.data ?? response ?? {};
    const user = payload?.user ?? payload?.data?.user ?? payload?.profile ?? payload?.data?.profile ?? {};
    const token = payload?.access_token ?? payload?.token ?? payload?.accessToken ?? payload?.data?.access_token ?? payload?.data?.token ?? null;
    const role = normalizeRole(payload?.role ?? payload?.role_name ?? payload?.roles?.[0] ?? user?.role ?? user?.role_name ?? user?.roles?.[0] ?? payload?.data?.role ?? payload?.data?.role_name ?? payload?.data?.roles?.[0] ?? null);
    const expiresIn = payload?.expires_in ?? payload?.expiresIn ?? payload?.data?.expires_in ?? payload?.data?.expiresIn ?? null;

    return {
        ...payload,
        access_token: token,
        token,
        user,
        role,
        isAdmin: Boolean(
            payload?.is_admin ??
            payload?.isAdmin ??
            user?.is_admin ??
            user?.isAdmin ??
            role === "ROLE_ADMIN"
        ),
        expires_in: expiresIn,
    };
};

const login = async (loginData) => {
    try {
        const response = await axios.post("/auth/login", loginData);
        return normalizeAuthResponse(response);
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