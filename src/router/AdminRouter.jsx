import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";

const ADMIN_ROLES = ["ROLE_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"];

const AdminRouter = ({ children }) => {
    const token =
        Cookies.get("access_token") ||
        Cookies.get("token") ||
        window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("token");
    const role = (
        Cookies.get("user_role") ||
        window.localStorage.getItem("user_role") ||
        ""
    ).trim().toUpperCase();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (!ADMIN_ROLES.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRouter;
