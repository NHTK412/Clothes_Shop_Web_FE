import { Link } from "react-router-dom";

const ClientHeader = () => {

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
                    <button
                        className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150">
                        <span className="material-symbols-outlined">shopping_cart</span>
                        <span className="hidden lg:inline font-label-md text-label-md">Giỏ hàng</span>
                    </button>
                    <button
                        className="flex items-center gap-xs p-xs text-primary transition-transform active:scale-95 duration-150">
                        <span className="material-symbols-outlined">person</span>
                        <span className="hidden lg:inline font-label-md text-label-md">Tài khoản</span>
                    </button>
                </div>
            </div>
        </header>
    )
}

export default ClientHeader;