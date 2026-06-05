import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ClientLayout from "../layouts/ClientLayout";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import PublicRouter from "./PublicRouter";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";

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
            },
            {
                path: "reset-password",
                element: (
                    <PublicRouter>
                        <ResetPasswordPage />
                    </PublicRouter>
                )
            }
        ]
    }
]);

export default router;