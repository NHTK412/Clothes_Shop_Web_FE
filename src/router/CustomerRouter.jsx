import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";

const ADMIN_ROLES = ["ROLE_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"];

const CustomerRouter = ({ children }) => {
    const token =
        Cookies.get("access_token") ||
        Cookies.get("token") ||
        window.localStorage.getItem("access_token") ||
        window.localStorage.getItem("token");
    const role = (
        Cookies.get("user_role") ||
        window.localStorage.getItem("user_role") ||
        ""
    ).toUpperCase();

    if (token && ADMIN_ROLES.includes(role)) {
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default CustomerRouter;
