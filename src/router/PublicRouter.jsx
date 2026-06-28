import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";

const PublicRouter = ({ children }) => {
    const token = Cookies.get("access_token");
    const role = Cookies.get("user_role")?.toUpperCase() || "";
    const isAdmin = role === "ROLE_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";

    if (token) {
        return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
    }

    return children;
}

export default PublicRouter;