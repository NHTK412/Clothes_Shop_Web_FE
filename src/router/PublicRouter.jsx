import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";

const PublicRouter = ({ children }) => {
    const token = Cookies.get("access_token");
    if (token) {
        return <Navigate to="/" />
    }

    return children;
}

export default PublicRouter;