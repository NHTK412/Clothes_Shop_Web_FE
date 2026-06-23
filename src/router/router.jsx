import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ClientLayout from "../layouts/ClientLayout";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import PublicRouter from "./PublicRouter";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import HomePage from "../pages/customer/HomePage";
import ProductListPage from "../pages/customer/ProductListPage";
import ProductDetailPage from "../pages/customer/ProductDetailPage";
import CartDetailPage from "../pages/customer/CartDetailPage";
import CheckoutPage from "../pages/customer/CheckoutPage";
import ReturnPage from "../pages/customer/ReturnPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <ClientLayout />,
        children: [
            {
                index: true,
                element: <HomePage />
            },
            {
                path: "products",
                element: <ProductListPage />
            },
            {
                path: "products/:id",
                element: <ProductDetailPage />
            },
            {
                path: "cart",
                element: <CartDetailPage />
            },
            {
                path: "checkout",
                element: <CheckoutPage />
            },
            {
                path: "return",
                element: <ReturnPage />
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
