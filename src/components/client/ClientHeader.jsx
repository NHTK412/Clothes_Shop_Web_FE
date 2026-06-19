import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import CartService from "../../services/CartService";

const ClientHeader = () => {
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(Cookies.get("access_token")));
    const [cartItemsCount, setCartItemsCount] = useState(0);

    useEffect(() => {
        const fetchCartItemsCount = async () => {
            const token = Cookies.get("access_token");
            setIsAuthenticated(Boolean(token));

            if (!token) {
                setCartItemsCount(0);
                return;
            }

            try {
                const count = await CartService.getItemsCount();
                setCartItemsCount(Number(count) || 0);
            } catch {
                setCartItemsCount(0);
            }
        };

        fetchCartItemsCount();
    }, [location.pathname]);

    return (
        <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50">
            <div className="max-w-max-width mx-auto w-full flex justify-between items-center px-lg py-sm">
                <Link className="text-headline-md font-headline-md font-bold text-primary tracking-tighter" to="/">Clothes
                    Shop</Link>
                <nav className="hidden md:flex items-center gap-md">
                    <Link className="font-label-md text-label-md text-secondary hover:text-primary transition-colors duration-200"
                        to="/">Trang Chủ</Link>
                    <Link className="font-label-md text-label-md text-secondary hover:text-primary transition-colors duration-200"
                        to="/products">Cửa Hàng</Link>
                    <Link className="font-label-md text-label-md text-secondary hover:text-primary transition-colors duration-200"
                        to="#">Danh Mục</Link>
                    <Link className="font-label-md text-label-md text-secondary hover:text-primary transition-colors duration-200"
                        to="#">Tin Tức</Link>
                </nav>
                <div className="flex items-center gap-sm">
                    {isAuthenticated ? (
                        <>
                    <button
                        className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150">
                        <span className="relative flex">
                            <span className="material-symbols-outlined">shopping_cart</span>
                            <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-bold leading-none text-on-error">
                                {cartItemsCount > 99 ? "99+" : cartItemsCount}
                            </span>
                        </span>
                        <span className="hidden lg:inline font-label-md text-label-md">Giỏ hàng</span>
                    </button>
                    <button
                        className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150">
                        <span className="material-symbols-outlined">person</span>
                        <span className="hidden lg:inline font-label-md text-label-md">Tài khoản</span>
                    </button>
                        </>
                    ) : (
                        <>
                            <Link
                                className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                to="/login">
                                <span className="material-symbols-outlined">login</span>
                                <span className="hidden lg:inline font-label-md text-label-md">Đăng nhập</span>
                            </Link>
                            <Link
                                className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                to="/register">
                                <span className="material-symbols-outlined">person_add</span>
                                <span className="hidden lg:inline font-label-md text-label-md">Đăng ký</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

export default ClientHeader;
