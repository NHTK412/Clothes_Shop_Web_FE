import Cookies from "js-cookie";

const TOKEN_KEYS = ["access_token", "token"];
const SESSION_KEYS = [...TOKEN_KEYS, "user_role", "refresh_token"];

export const getAccessToken = () => {
    if (typeof window === "undefined") return null;

    return (
        Cookies.get("access_token") ||
        Cookies.get("token") ||
        window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("token") ||
        null
    );
};

export const getUserRole = () => {
    if (typeof window === "undefined") return "";

    return (
        Cookies.get("user_role") ||
        window.localStorage.getItem("user_role") ||
        ""
    ).trim().toUpperCase();
};

export const isTokenExpired = (token) => {
    if (!token || token.split(".").length !== 3) return false;

    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
        const payload = JSON.parse(window.atob(base64));

        return typeof payload.exp === "number" &&
            payload.exp * 1000 <= Date.now();
    } catch {
        // Let the backend validate malformed or non-standard tokens.
        return false;
    }
};

export const clearAuthSession = () => {
    if (typeof window === "undefined") return;

    SESSION_KEYS.forEach((key) => {
        Cookies.remove(key);
        Cookies.remove(key, { path: "/" });
        window.localStorage.removeItem(key);
    });
};

export const getLoginUrl = () => {
    if (typeof window === "undefined") return "/login";

    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (
        currentPath === "/" ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/register"
    ) {
        return "/login";
    }

    return `/login?redirect=${encodeURIComponent(currentPath)}`;
};

export const getSafeRedirectPath = (value, fallback = "/") => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return fallback;
    }

    return value;
};
