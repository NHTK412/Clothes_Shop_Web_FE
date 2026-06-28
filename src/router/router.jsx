import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import ClientLayout from "../layouts/ClientLayout";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import PublicRouter from "./PublicRouter";
import CustomerRouter from "./CustomerRouter";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import HomePage from "../pages/customer/HomePage";
import ProductListPage from "../pages/customer/ProductListPage";
import ProductDetailPage from "../pages/customer/ProductDetailPage";
import CartDetailPage from "../pages/customer/CartDetailPage";
import CategoryPage from "../pages/customer/CategoryPage";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminProductListPage from "../pages/admin/AdminProductListPage";
import AdminProductDetailPage from "../pages/admin/AdminProductDetailPage";
import AdminProductEditPage from "../pages/admin/AdminProductEditPage";
import AdminCategoryListPage from "../pages/admin/AdminCategoryListPage";
import AdminCustomerListPage from "../pages/admin/AdminCustomerListPage";
import AdminCustomerDetailPage from "../pages/admin/AdminCustomerDetailPage";
import AdminOrderListPage from "../pages/admin/AdminOrderListPage";
import AdminOrderDetailPage from "../pages/admin/AdminOrderDetailPage";
import AdminSettingsPage from "../pages/admin/AdminSettingsPage";
import AdminPromotionListPage from "../pages/admin/AdminPromotionListPage";
import CheckoutPage from "../pages/customer/CheckoutPage";
import ReturnPage from "../pages/customer/ReturnPage";
import OrdersPage from "../pages/customer/OrdersPage";
import OrderDetailPage from "../pages/customer/OrderDetailPage";
import ProfilePage from "../pages/customer/ProfilePage";
import FavoriteProductsPage from "../pages/customer/FavoriteProductsPage";

const router = createBrowserRouter([
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            {
                index: true,
                element: <AdminDashboardPage />
            },
            {
                path: "dashboard",
                element: <AdminDashboardPage />
            },
            {
                path: "products",
                element: <AdminProductListPage />
            },
            {
                path: "products/:id",
                element: <AdminProductDetailPage />
            },
            {
                path: "products/:id/edit",
                element: <AdminProductEditPage />
            },
            {
                path: "promotions",
                element: <AdminPromotionListPage />
            },
            {
                path: "customers",
                element: <AdminCustomerListPage />
            },
            {
                path: "customers/:id",
                element: <AdminCustomerDetailPage />
            },
            {
                path: "orders",
                element: <AdminOrderListPage />
            },
            {
                path: "orders/:id",
                element: <AdminOrderDetailPage />
            },
            {
                path: "categories",
                element: <AdminCategoryListPage />
            },
            {
                path: "settings",
                element: <AdminSettingsPage />
            }
        ]
    },
    {
        path: "/",
        element: (
            <CustomerRouter>
                <ClientLayout />
            </CustomerRouter>
        ),
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
                path: "categories",
                element: <CategoryPage />
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
                path: "products/:id",
                element: <ProductDetailPage />
            },
            {
                path: "favorites",
                element: <FavoriteProductsPage />
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
                path: "profile",
                element: <ProfilePage />
            },
            {
                path: "orders",
                element: <OrdersPage />
            },
            {
                path: "orders/:id",
                element: <OrderDetailPage />
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
