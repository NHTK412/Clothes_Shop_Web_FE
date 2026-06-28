import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { notification } from "antd";
import Cookies from "js-cookie";
import ProductsService from "../../services/ProductsService";
import ProfileService from "../../services/ProfileService";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const resolveImage = (image, productId) => {
    if (!image) return productId ? `https://picsum.photos/seed/product-${productId}/800/1000` : "https://picsum.photos/800/1000";
    if (/^https?:\/\//i.test(image)) return image;
    return `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
};

const normalizeFavoriteProduct = (favorite) => {
    const product = favorite?.product ?? favorite;
    const firstVariant = Array.isArray(product?.variants)
        ? product.variants[0]
        : Array.isArray(product?.product_variants)
            ? product.product_variants[0]
            : null;

    const id = product?.id ?? favorite?.product_id ?? favorite?.productId ?? product?.product_id ?? null;
    const originalPrice = Number(product?.price ?? firstVariant?.price ?? 0);
    const discountAmount = Number(product?.discount_price ?? firstVariant?.discount_price ?? 0);
    const price = Math.max(originalPrice - discountAmount, 0);
    const category = typeof product?.category === "string"
        ? product.category
        : product?.category?.name ?? product?.categories?.[0]?.name ?? "";

    return {
        id,
        name: product?.name ?? product?.title ?? `Sản phẩm #${id || ""}`,
        image: resolveImage(product?.image ?? product?.thumbnail ?? firstVariant?.image, id),
        category,
        originalPrice,
        discountAmount,
        price,
        priceDisplay: formatCurrency(price || originalPrice),
    };
};

const FavoriteProductsPage = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadFavorites = async () => {
            const token = Cookies.get("access_token");
            if (!token) {
                navigate("/login");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const profile = await ProfileService.getProfile();
                const response = await ProductsService.getUserFavorites(profile?.id);
                if (!mounted) return;
                setFavorites((response || []).map(normalizeFavoriteProduct).filter((item) => item.id));
            } catch (err) {
                if (!mounted) return;
                setFavorites([]);
                setError(err?.response?.data?.message || "Không thể tải danh sách sản phẩm yêu thích. Vui lòng thử lại.");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadFavorites();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const favoriteCount = useMemo(() => favorites.length, [favorites.length]);

    const handleRemoveFavorite = async (event, productId) => {
        event.preventDefault();
        event.stopPropagation();

        if (!productId || removingId === productId) return;

        const previousFavorites = favorites;
        setFavorites((currentFavorites) => currentFavorites.filter((item) => item.id !== productId));
        setRemovingId(productId);

        try {
            await ProductsService.removeFavorite(productId);
            notification.success({
                message: "Đã bỏ yêu thích",
                description: "Sản phẩm đã được xóa khỏi danh sách yêu thích.",
            });
        } catch (err) {
            setFavorites(previousFavorites);
            notification.error({
                message: "Không thể bỏ yêu thích",
                description: err?.response?.data?.message || "Vui lòng thử lại sau.",
            });
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
            <div className="mb-lg flex flex-col gap-sm md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                        Bộ sưu tập cá nhân
                    </p>
                    <h1 className="mt-xs font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
                        Sản phẩm yêu thích
                    </h1>
                    <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
                        {favoriteCount > 0 ? `${favoriteCount} sản phẩm đang được bạn lưu lại.` : "Những sản phẩm bạn yêu thích sẽ xuất hiện tại đây."}
                    </p>
                </div>
                <Link
                    className="inline-flex items-center justify-center gap-xs rounded-lg border border-primary px-md py-sm font-label-md text-label-md text-primary transition-colors hover:bg-secondary-container"
                    to="/products"
                >
                    <span className="material-symbols-outlined text-base">storefront</span>
                    Tiếp tục mua sắm
                </Link>
            </div>

            {error ? (
                <div className="mb-md border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-error">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="animate-pulse overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
                            <div className="aspect-[3/4] bg-surface-container-high" />
                            <div className="p-sm">
                                <div className="mx-auto h-4 w-20 rounded bg-surface-container-high" />
                                <div className="mx-auto mt-sm h-5 w-32 rounded bg-surface-container-high" />
                                <div className="mx-auto mt-sm h-5 w-24 rounded bg-surface-container-high" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : favorites.length > 0 ? (
                <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
                    {favorites.map((product) => (
                        <Link
                            key={product.id}
                            className="group overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-all duration-300 hover:border-primary hover:shadow-md"
                            to={`/products/${product.id}`}
                        >
                            <div className="relative aspect-[3/4] overflow-hidden">
                                <img
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    src={product.image}
                                />
                                <button
                                    aria-label="Bỏ yêu thích"
                                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-500 bg-white/95 text-red-600 shadow-sm backdrop-blur transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={removingId === product.id}
                                    type="button"
                                    onClick={(event) => handleRemoveFavorite(event, product.id)}
                                >
                                    <span
                                        className="material-symbols-outlined text-xl"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        favorite
                                    </span>
                                </button>
                            </div>
                            <div className="p-sm text-center">
                                <p className="mb-1 truncate font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                                    {product.category || "Sản phẩm"}
                                </p>
                                <h2 className="truncate font-headline-sm text-headline-sm text-on-surface">
                                    {product.name}
                                </h2>
                                <div className="mt-2">
                                    {product.discountAmount > 0 && product.originalPrice > product.price ? (
                                        <p className="text-body-sm text-secondary line-through">
                                            {formatCurrency(product.originalPrice)}
                                        </p>
                                    ) : null}
                                    <p className="font-body-md text-body-md font-bold text-primary">
                                        {product.priceDisplay}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-center">
                    <span className="material-symbols-outlined text-5xl text-primary">favorite</span>
                    <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
                        Chưa có sản phẩm yêu thích
                    </h2>
                    <p className="mt-xs text-body-md text-secondary">
                        Bấm biểu tượng trái tim trên sản phẩm để lưu lại những món bạn thích.
                    </p>
                    <Link
                        className="mt-md inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm font-label-md text-on-primary"
                        to="/products"
                    >
                        Khám phá sản phẩm
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                    </Link>
                </div>
            )}
        </main>
    );
};

export default FavoriteProductsPage;
