import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import OrderService from "../../services/OrderService";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const statusMeta = {
    PENDING_PAYMENT: {
        label: "Chờ thanh toán",
        className: "bg-secondary-container text-on-secondary-container",
    },
    CONFIRMED: {
        label: "Đã xác nhận",
        className: "bg-primary-fixed text-on-primary-fixed",
    },
    SHIPPING: {
        label: "Đang giao",
        className: "bg-tertiary-fixed text-on-tertiary-fixed",
    },
    COMPLETED: {
        label: "Hoàn thành",
        className: "bg-green-100 text-green-800",
    },
    CANCELLED: {
        label: "Đã hủy",
        className: "bg-error-container text-on-error-container",
    },
    RETURNED: {
        label: "Trả hàng",
        className: "bg-surface-container-high text-on-surface-variant",
    },
};

const paymentStatusMeta = {
    PAID: "Đã thanh toán",
    UNPAID: "Chưa thanh toán",
    FAILED: "Thanh toán lỗi",
    REFUNDED: "Đã hoàn tiền",
};

const formatDateTime = (dateString) => {
    if (!dateString) return "Đang cập nhật";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Đang cập nhật";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const resolveImage = (image) => {
    if (!image) return "";
    if (/^https?:\/\//i.test(image)) return image;
    return `${BACKEND_ORIGIN}/${String(image).replace(/^\/+/, "")}`;
};

const getItemFinalPrice = (item) => {
    const originalPrice = Number(item?.unit_price || 0);
    const discountAmount = Number(item?.unit_discount_price || 0);
    return Math.max(originalPrice - discountAmount, 0);
};

const OrderDetailPage = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchOrder = async () => {
            setIsLoading(true);
            setError("");

            try {
                const response = await OrderService.getOrderDetail(id);
                if (!isMounted) return;
                setOrder(response);
            } catch (err) {
                if (!isMounted) return;
                setOrder(null);
                setError(err?.response?.data?.message || "Không thể tải chi tiết đơn hàng. Vui lòng thử lại.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrder();

        return () => {
            isMounted = false;
        };
    }, [id]);

    const details = order?.order_details ?? [];
    const meta = statusMeta[order?.status] || {
        label: order?.status || "Đang cập nhật",
        className: "bg-surface-container-high text-on-surface-variant",
    };
    const totalQuantity = useMemo(
        () => details.reduce((total, item) => total + Number(item.quantity || 0), 0),
        [details]
    );

    const handlePayNow = async () => {
        if (!order?.id || isPaymentLoading) return;

        setIsPaymentLoading(true);
        setPaymentError("");

        try {
            const response = await OrderService.createVnpayPaymentUrl({
                order_id: order.id,
                bank_code: "VNBANK",
                locale: "vn",
            });

            if (response?.payment_url) {
                window.location.assign(response.payment_url);
                return;
            }

            setPaymentError("Không lấy được liên kết thanh toán. Vui lòng thử lại.");
        } catch (err) {
            setPaymentError(err?.response?.data?.message || "Không thể tạo liên kết thanh toán. Vui lòng thử lại.");
        } finally {
            setIsPaymentLoading(false);
        }
    };

    if (isLoading) {
        return (
            <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
                <div className="mb-md h-10 w-44 animate-pulse rounded bg-surface-container-high" />
                <div className="grid gap-md lg:grid-cols-[1fr_360px]">
                    <div className="h-96 animate-pulse border border-outline-variant bg-surface-container-lowest" />
                    <div className="h-80 animate-pulse border border-outline-variant bg-surface-container-lowest" />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
                <Link className="mb-md inline-flex items-center gap-xs text-primary" to="/orders">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Quay lại đơn hàng
                </Link>
                <div className="border border-error-container bg-error-container/30 p-lg text-center">
                    <span className="material-symbols-outlined text-5xl text-error">error</span>
                    <h1 className="mt-sm font-headline-sm text-headline-sm text-on-surface">Không tải được đơn hàng</h1>
                    <p className="mt-xs text-body-md text-error">{error}</p>
                </div>
            </main>
        );
    }

    if (!order) {
        return null;
    }

    return (
        <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
            <div className="mb-lg flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link className="mb-sm inline-flex items-center gap-xs text-body-sm text-primary hover:underline" to="/orders">
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Danh sách đơn hàng
                    </Link>
                    <div className="flex flex-wrap items-center gap-xs">
                        <h1 className="font-display-md text-display-md-mobile text-on-surface md:text-display-md">
                            Đơn hàng #{order.id}
                        </h1>
                        <span className={`rounded px-xs py-[3px] text-[11px] font-bold uppercase ${meta.className}`}>
                            {meta.label}
                        </span>
                    </div>
                    <p className="mt-xs text-body-md text-on-surface-variant">
                        Mã GHN: <span className="font-label-md text-on-surface">{order.ghn_order_code || "Đang cập nhật"}</span>
                    </p>
                </div>

                <div className="text-left sm:text-right">
                    {
                        (order.status === "PENDING_PAYMENT" && order.payment?.status === "UNPAID") ? (
                            <>
                            <button
                                className="mt-sm inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-xs font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60"
                                type="button"
                                disabled={isPaymentLoading}
                                onClick={handlePayNow}
                            >
                                {isPaymentLoading ? "Đang tạo thanh toán..." : "Thanh toán ngay"}
                                <span className="material-symbols-outlined text-base">chevron_right</span>
                            </button>
                            {paymentError ? (
                                <p className="mt-xs max-w-xs text-body-sm text-error">{paymentError}</p>
                            ) : null}
                            </>
                        ) : null
                    }
                </div>
            </div>

            <div className="grid gap-md lg:grid-cols-[1fr_360px]">
                <section className="flex flex-col gap-md">
                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <div className="mb-sm flex items-center gap-xs">
                            <span className="material-symbols-outlined text-primary">local_shipping</span>
                            <h2 className="font-headline-sm text-headline-sm text-on-surface">Thông tin giao hàng</h2>
                        </div>
                        <div className="grid gap-sm text-body-sm text-on-surface-variant sm:grid-cols-2">
                            <p>
                                Người nhận: <span className="font-medium text-on-surface">{order.full_name}</span>
                            </p>
                            <p>
                                Số điện thoại: <span className="font-medium text-on-surface">{order.phone}</span>
                            </p>
                            <p className="sm:col-span-2">
                                Địa chỉ:{" "}
                                <span className="font-medium text-on-surface">
                                    {[order.specific_address, order.ward_name, order.province_name].filter(Boolean).join(", ")}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <div className="mb-md flex items-center justify-between gap-sm border-b border-outline-variant pb-sm">
                            <div>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Sản phẩm đã đặt</h2>
                                <p className="text-body-sm text-on-surface-variant">{totalQuantity} sản phẩm</p>
                            </div>
                        </div>

                        <div className="flex flex-col divide-y divide-outline-variant">
                            {details.map((item) => {
                                const product = item.product_variant?.product;
                                const image = resolveImage(item.product_variant?.image);
                                const finalUnitPrice = getItemFinalPrice(item);
                                const discountAmount = Number(item.unit_discount_price || 0);

                                return (
                                    <div key={item.id} className="flex gap-sm py-md">
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container-high">
                                            {image ? (
                                                <img
                                                    alt={product?.name || "Sản phẩm"}
                                                    className="h-full w-full object-cover"
                                                    src={image}
                                                />
                                            ) : (
                                                <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-on-surface-variant">
                                                    image
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-label-md text-label-md text-on-surface">
                                                {product?.name || `Sản phẩm #${item.product_variant_id}`}
                                            </h3>
                                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                                Mã biến thể: {item.product_variant_id}
                                            </p>
                                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                                Số lượng: {item.quantity}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-label-md text-label-md text-primary">
                                                {formatCurrency(finalUnitPrice)}
                                            </p>
                                            {discountAmount > 0 ? (
                                                <p className="text-body-sm text-on-surface-variant line-through">
                                                    {formatCurrency(item.unit_price)}
                                                </p>
                                            ) : null}
                                            <p className="mt-xs text-body-sm text-on-surface-variant">
                                                x{item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </section>

                <aside className="flex flex-col gap-md">
                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <h2 className="mb-sm font-headline-sm text-headline-sm text-on-surface">Thanh toán</h2>
                        <div className="flex flex-col gap-xs text-body-sm">
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Phương thức</span>
                                <span className="font-medium text-on-surface">{order.payment?.method || "Đang cập nhật"}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Trạng thái</span>
                                <span className="font-medium text-on-surface">
                                    {paymentStatusMeta[order.payment?.status] || order.payment?.status || "Đang cập nhật"}
                                </span>
                            </div>
                            <div className="my-xs border-t border-outline-variant" />
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Tạm tính</span>
                                <span className="font-medium text-on-surface">{formatCurrency(order.total_price)}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Giảm giá</span>
                                <span className="font-medium text-error">-{formatCurrency(order.discount_price)}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Phí vận chuyển</span>
                                <span className="font-medium text-on-surface">{formatCurrency(order.ship_price)}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Giảm phí vận chuyển</span>
                                <span className="font-medium text-error">-{formatCurrency(order.discount_ship_price)}</span>
                            </div>
                            <div className="flex justify-between gap-sm border-t border-outline-variant pt-sm">
                                <span className="font-label-md text-on-surface">Thành tiền</span>
                                <span className="font-headline-sm text-primary">{formatCurrency(order.final_price)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <h2 className="mb-sm font-headline-sm text-headline-sm text-on-surface">Thông tin đơn hàng</h2>
                        <div className="flex flex-col gap-xs text-body-sm">
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Mã đơn</span>
                                <span className="font-medium text-on-surface">#{order.id}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Ngày tạo</span>
                                <span className="font-medium text-on-surface">{formatDateTime(order.created_at)}</span>
                            </div>
                            <div className="flex justify-between gap-sm">
                                <span className="text-on-surface-variant">Cập nhật</span>
                                <span className="font-medium text-on-surface">{formatDateTime(order.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default OrderDetailPage;
