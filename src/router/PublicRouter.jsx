import { Navigate } from "react-router-dom";
import {
    clearAuthSession,
    getAccessToken,
    getUserRole,
    isTokenExpired,
} from "../utils/authSession";

const PublicRouter = ({ children }) => {
    const token = getAccessToken();
    const role = getUserRole();
    const isAdmin = ["ROLE_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role);

    if (token) {
        if (isTokenExpired(token)) {
            clearAuthSession();
            return children;
        }
        return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
    }

    return children;
}

export default PublicRouter;
