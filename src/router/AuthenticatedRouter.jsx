import { Navigate, useLocation } from "react-router-dom";
import {
    clearAuthSession,
    getAccessToken,
    isTokenExpired,
} from "../utils/authSession";

const AuthenticatedRouter = ({ children }) => {
    const location = useLocation();
    const token = getAccessToken();

    if (!token || isTokenExpired(token)) {
        if (token) clearAuthSession();

        const redirect = `${location.pathname}${location.search}`;
        return (
            <Navigate
                to={`/login?redirect=${encodeURIComponent(redirect)}`}
                replace
            />
        );
    }

    return children;
};

export default AuthenticatedRouter;
