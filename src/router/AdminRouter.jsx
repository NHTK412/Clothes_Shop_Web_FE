import { Navigate } from "react-router-dom";
import {
    clearAuthSession,
    getAccessToken,
    getUserRole,
    isTokenExpired,
} from "../utils/authSession";

const ADMIN_ROLES = ["ROLE_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"];

const AdminRouter = ({ children }) => {
    const token = getAccessToken();
    const role = getUserRole();

    if (!token || isTokenExpired(token)) {
        if (token) clearAuthSession();
        return <Navigate to="/login" replace />;
    }

    if (!ADMIN_ROLES.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRouter;
