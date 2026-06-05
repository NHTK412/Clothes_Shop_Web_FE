import axios from "axios";
import Cookies from "js-cookie";
const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api",
})
const whileList = ["/auth/login", "/auth/register", "/auth/refresh-token"];

instance.interceptors.request.use(
    (config) => {
        if (whileList.some((url) => config.url.includes(url))) {
            return config;
        }

        const token = Cookies.get("access_token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }

        return config;
    }
);

instance.interceptors.response.use(
    (response) => response.data
);

export default instance;