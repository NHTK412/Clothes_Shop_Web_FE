import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ClientLayout from "../layouts/ClientLayout";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import PublicRouter from "./PublicRouter";

const router = createBrowserRouter([
    {
        path: "/",
        element: <ClientLayout />,
        children: [
            {
                index: true,
                element: <h1>Home Page</h1>
            },
            {
                path: "login",
                element: (
                    <PublicRouter>
                        <LoginPage />
                    </PublicRouter>
                )
            },
            {
                path: "register",
                element: (
                    <PublicRouter>
                        <RegisterPage />
                    </PublicRouter>
                )
            },
            {
                path: "forgot-password",
                element: (
                    <PublicRouter>
                        <ForgotPasswordPage />
                    </PublicRouter>
                )
            }
        ]
    }
]);

export default router;