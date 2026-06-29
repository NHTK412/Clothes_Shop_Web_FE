import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import CartService from "../../services/CartService";

const ClientHeader = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(Cookies.get("access_token")));
    const [cartItemsCount, setCartItemsCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);

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
        window.addEventListener("cart:updated", fetchCartItemsCount);

        return () => {
            window.removeEventListener("cart:updated", fetchCartItemsCount);
        };
    }, [location.pathname]);

    const handleLogout = () => {
        Cookies.remove("access_token");
        setIsAuthenticated(false);
        setCartItemsCount(0);
        setMobileMenuOpen(false);
        setAccountMenuOpen(false);
        navigate("/");
    };

    const navigationLinks = [
        { to: "/", label: "Trang chủ" },
        { to: "/products", label: "Cửa hàng" },
        ...(isAuthenticated ? [{ to: "/favorites", label: "Yêu thích" }] : []),
        { to: "/categories", label: "Danh mục" },
    ];

    return (
        <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50">
            <div className="relative mx-auto flex w-full max-w-max-width items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-10">
                <Link className="shrink-0 text-xl font-bold tracking-tighter text-primary sm:text-2xl" to="/">
                    Clothes Shop
                </Link>
                <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 lg:flex">
                    {navigationLinks.map((item) => (
                        <Link
                            key={item.to}
                            className="font-label-md text-label-md text-secondary transition-colors duration-200 hover:text-primary"
                            to={item.to}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="relative ml-auto flex items-center gap-1 sm:gap-2">
                    {isAuthenticated ? (
                        <>
                            <Link
                                className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                to="/cart">
                                <span className="relative flex">
                                    <span className="material-symbols-outlined">shopping_cart</span>
                                    <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-bold leading-none text-on-error">
                                        {cartItemsCount > 99 ? "99+" : cartItemsCount}
                                    </span>
                                </span>
                                <span className="hidden xl:inline font-label-md text-label-md">Giỏ hàng</span>
                            </Link>
                            <div className="group relative hidden lg:block">
                                <button
                                    onClick={() => setAccountMenuOpen((value) => !value)}
                                    aria-expanded={accountMenuOpen}
                                    className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                    type="button">
                                    <span className="material-symbols-outlined">person</span>
                                    <span className="hidden lg:inline font-label-md text-label-md">Tài khoản</span>
                                </button>
                                <div
                                    className={`absolute right-0 top-full z-50 w-72 origin-top-right pt-2 transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto ${
                                        accountMenuOpen
                                            ? "translate-y-0 scale-100 opacity-100"
                                            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                                    }`}
                                >
                                    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
                                        <div className="p-2">
                                            <Link
                                                to="/profile"
                                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-on-surface transition-colors hover:bg-surface-container"
                                            >
                                                <span className="material-symbols-outlined text-primary">
                                                    manage_accounts
                                                </span>
                                                <span>Hồ sơ cá nhân</span>
                                            </Link>
                                            <Link
                                                to="/orders"
                                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-on-surface transition-colors hover:bg-surface-container"
                                            >
                                                <span className="material-symbols-outlined text-primary">
                                                    receipt_long
                                                </span>
                                                <span>Danh sách đơn hàng</span>
                                            </Link>
                                        </div>
                                        <div className="border-t border-outline-variant p-2">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-error transition-colors hover:bg-error/10"
                                            >
                                                <span className="material-symbols-outlined">logout</span>
                                                <span>Đăng xuất</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="hidden items-center gap-1 lg:flex">
                            <Link
                                className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                to="/login">
                                <span className="material-symbols-outlined">login</span>
                                <span className="font-label-md text-label-md">Đăng nhập</span>
                            </Link>
                            <Link
                                className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150"
                                to="/register">
                                <span className="material-symbols-outlined">person_add</span>
                                <span className="font-label-md text-label-md">Đăng ký</span>
                            </Link>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((value) => !value)}
                        aria-expanded={mobileMenuOpen}
                        aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface-container lg:hidden"
                    >
                        <span className="material-symbols-outlined">
                            {mobileMenuOpen ? "close" : "menu"}
                        </span>
                    </button>
                </div>
            </div>
            {mobileMenuOpen && (
                <div className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-lg sm:px-6 lg:hidden">
                    <nav className="mx-auto grid max-w-max-width gap-1">
                        {navigationLinks.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg px-3 py-3 font-medium text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="my-1 border-t border-outline-variant" />
                        {isAuthenticated ? (
                            <>
                                <Link onClick={() => setMobileMenuOpen(false)} to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-surface-container">
                                    <span className="material-symbols-outlined text-primary">manage_accounts</span>
                                    Hồ sơ cá nhân
                                </Link>
                                <Link onClick={() => setMobileMenuOpen(false)} to="/orders" className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-surface-container">
                                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                                    Đơn hàng của tôi
                                </Link>
                                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-error hover:bg-error/10">
                                    <span className="material-symbols-outlined">logout</span>
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Link onClick={() => setMobileMenuOpen(false)} to="/login" className="rounded-lg border border-primary px-3 py-3 text-center font-medium text-primary">
                                    Đăng nhập
                                </Link>
                                <Link onClick={() => setMobileMenuOpen(false)} to="/register" className="rounded-lg bg-primary px-3 py-3 text-center font-medium text-on-primary">
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}

export default ClientHeader;
