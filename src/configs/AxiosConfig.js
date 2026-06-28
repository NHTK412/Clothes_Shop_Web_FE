import axios from "axios";
import Cookies from "js-cookie";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api",
});
const whileList = ["/auth/login", "/auth/register", "/auth/refresh-token"];

// Helper to decode JWT payload (not verify, just read)
const decodeJWT = (token) => {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch (e) {
        return null;
    }
};

const getStoredToken = () => {
    if (typeof window === "undefined") return null;

    // Always try to read from cookies first (most reliable)
    const cookieToken = Cookies.get("access_token") || Cookies.get("token");
    if (cookieToken) return cookieToken;

    // Fallback to localStorage
    return window.localStorage.getItem("access_token") || window.localStorage.getItem("token") || null;
};

instance.interceptors.request.use(
    (config) => {
        // Skip auth for public endpoints
        if (whileList.some((url) => config.url.includes(url))) {
            return config;
        }

        // Read token on every request (fresh read)
        const token = getStoredToken();
        const userRole = Cookies.get("user_role") || window.localStorage.getItem("user_role");
        
        console.group(`[Axios] 📤 ${config.method?.toUpperCase()} ${config.url}`);
        
        if (token) {
            config.headers = {
                ...(config.headers || {}),
                Authorization: `Bearer ${token}`,
                // Add role as custom header (workaround for backend not including role in JWT)
                "X-User-Role": userRole || "ROLE_CUSTOMER",
            };
            console.log(`Token (first 30 chars): ${token.substring(0, 30)}...`);
            
            // Decode and show JWT payload
            const jwtPayload = decodeJWT(token);
            if (jwtPayload) {
                console.log(`JWT Payload:`, jwtPayload);
                console.log(`⚠️ JWT has NO role claim - using X-User-Role header instead`);
            }
            
            console.log(`User Role (from storage): ${userRole}`);
            console.log(`Custom Header X-User-Role: ${userRole || "ROLE_CUSTOMER"}`);
        } else {
            console.warn(`⚠️ No token found!`);
            console.log(`Cookies:`, Object.keys(Cookies.get() || {}));
            console.log(`localStorage keys:`, Object.keys(window.localStorage));
        }
        
        console.groupEnd();

        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const data = error.response?.data;
        
        console.group(`[Axios] ❌ Error ${status} on ${url}`);
        console.log(`Response:`, data);
        
        if (status === 403) {
            console.error(`Forbidden - Check if user has admin role`);
            const storedRole = Cookies.get("user_role") || window.localStorage.getItem("user_role");
            console.log(`Current Role: ${storedRole}`);
        } else if (status === 401) {
            console.error(`Unauthorized - Token may be expired or invalid`);
        }
        
        console.groupEnd();
        return Promise.reject(error);
    }
);

export default instance;