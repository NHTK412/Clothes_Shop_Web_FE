import axios from "axios";
import {
    clearAuthSession,
    getAccessToken,
    getLoginUrl,
    getUserRole,
    isTokenExpired,
} from "../utils/authSession";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api",
});
const PUBLIC_AUTH_ENDPOINTS = [
    "/auth/login",
    "/auth/register",
    "/auth/oauth2",
    "/auth/send-reset-link",
    "/auth/reset-password",
    "/auth/refresh-token",
];
const CREDENTIAL_ENDPOINTS = PUBLIC_AUTH_ENDPOINTS.filter(
    (endpoint) => endpoint !== "/auth/refresh-token",
);

let redirectingToLogin = false;

const isPublicAuthRequest = (url = "") =>
    PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const isCredentialRequest = (url = "") =>
    CREDENTIAL_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const redirectToLogin = () => {
    if (typeof window === "undefined" || redirectingToLogin) return;

    clearAuthSession();
    if (window.location.pathname === "/login") return;

    redirectingToLogin = true;
    window.location.replace(getLoginUrl());
};

instance.interceptors.request.use(
    (config) => {
        if (isPublicAuthRequest(config.url)) {
            return config;
        }

        const token = getAccessToken();

        if (token) {
            if (isTokenExpired(token)) {
                redirectToLogin();
                return Promise.reject(
                    new axios.CanceledError("Phiên đăng nhập đã hết hạn."),
                );
            }

            config.headers = {
                ...(config.headers || {}),
                Authorization: `Bearer ${token}`,
                "X-User-Role": getUserRole() || "ROLE_CUSTOMER",
            };
        }

        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";

        if (status === 401 && !isCredentialRequest(requestUrl)) {
            redirectToLogin();
        }

        return Promise.reject(error);
    }
);

export default instance;
