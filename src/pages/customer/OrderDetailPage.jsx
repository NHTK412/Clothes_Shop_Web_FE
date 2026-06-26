import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Input, Modal, Rate, Upload, notification } from "antd";
import OrderService from "../../services/OrderService";
import UploadService from "../../services/UploadService";

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

const ghnStatusMeta = {
    ready_to_pick: "Chờ lấy hàng",
    picking: "Đang lấy hàng",
    money_collect_picking: "Đang thu tiền khi lấy hàng",
    picked: "Đã lấy hàng",
    storing: "Đang lưu kho",
    transporting: "Đang vận chuyển",
    sorting: "Đang phân loại",
    delivering: "Đang giao hàng",
    money_collect_delivering: "Đang thu tiền khi giao hàng",
    delivered: "Đã giao hàng",
    delivery_fail: "Giao hàng thất bại",
    waiting_to_return: "Chờ hoàn hàng",
    return: "Đang hoàn hàng",
    returned: "Đã hoàn hàng",
    cancel: "Đã hủy",
    exception: "Có vấn đề phát sinh",
};

const cancellableStatuses = ["PENDING_PAYMENT", "CONFIRMED"];

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
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const [reviewItem, setReviewItem] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewFiles, setReviewFiles] = useState([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [trackingItems, setTrackingItems] = useState([]);
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);
    const [trackingError, setTrackingError] = useState("");

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

    useEffect(() => {
        let isMounted = true;

        const fetchTracking = async () => {
            if (order?.status !== "SHIPPING" && order?.status !== "COMPLETED" && order?.status !== "RETURNED" || !order?.ghn_order_code) {
                setTrackingItems([]);
                setTrackingError("");
                setIsTrackingLoading(false);
                return;
            }

            setIsTrackingLoading(true);
            setTrackingError("");

            try {
                const response = await OrderService.getGhnTracking(order.ghn_order_code);
                if (!isMounted) return;
                setTrackingItems(Array.isArray(response) ? response : []);
            } catch (err) {
                if (!isMounted) return;
                setTrackingItems([]);
                setTrackingError(err?.response?.data?.message || "Không thể tải theo dõi vận chuyển. Vui lòng thử lại.");
            } finally {
                if (isMounted) {
                    setIsTrackingLoading(false);
                }
            }
        };

        fetchTracking();

        return () => {
            isMounted = false;
        };
    }, [order?.ghn_order_code, order?.status]);

    const details = useMemo(() => order?.order_details ?? [], [order?.order_details]);
    const meta = statusMeta[order?.status] || {
        label: order?.status || "Đang cập nhật",
        className: "bg-surface-container-high text-on-surface-variant",
    };
    const totalQuantity = useMemo(
        () => details.reduce((total, item) => total + Number(item.quantity || 0), 0),
        [details]
    );
    const canCancelOrder = cancellableStatuses.includes(order?.status);
    const canReviewOrder = order?.status === "COMPLETED";

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

    const cancelOrder = async () => {
        if (!order?.id || isCancelling || !canCancelOrder) return;

        setIsCancelling(true);
        setCancelError("");

        try {
            const response = await OrderService.cancelOrder(order.id);
            setOrder((currentOrder) => ({
                ...currentOrder,
                ...response,
            }));
        } catch (err) {
            setCancelError(err?.response?.data?.message || "Không thể hủy đơn hàng. Vui lòng thử lại.");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleCancelOrder = () => {
        if (!order?.id || isCancelling || !canCancelOrder) return;

        Modal.confirm({
            title: "Hủy đơn hàng?",
            content: "Đơn hàng sau khi hủy sẽ không thể tiếp tục xử lý. Bạn có chắc muốn hủy đơn hàng này?",
            okText: "Hủy đơn",
            cancelText: "Không",
            okButtonProps: { danger: true },
            centered: true,
            onOk: cancelOrder,
        });
    };

    const openReviewModal = (item) => {
        setReviewItem(item);
        setReviewRating(5);
        setReviewComment("");
        setReviewFiles([]);
    };

    const closeReviewModal = () => {
        setReviewItem(null);
        setReviewRating(5);
        setReviewComment("");
        setReviewFiles([]);
    };

    const handleSubmitReview = async () => {
        if (!order?.id || !reviewItem?.id || isSubmittingReview) return;

        if (!reviewRating) {
            notification.warning({
                message: "Chưa chọn số sao",
                description: "Vui lòng chọn từ 1 đến 5 sao để đánh giá sản phẩm.",
            });
            return;
        }

        setIsSubmittingReview(true);

        try {
            const imagePaths = [];
            for (const fileItem of reviewFiles.slice(0, 5)) {
                const file = fileItem.originFileObj || fileItem;
                if (!file) continue;

                const uploadResponse = await UploadService.uploadImage(file);
                const imagePath = uploadResponse?.image_url || uploadResponse?.url || uploadResponse?.path || "";
                if (imagePath) imagePaths.push(imagePath);
            }

            const payload = {
                order: order.id,
                orderDetail: reviewItem.id,
                rating: reviewRating,
                comment: reviewComment.trim() || null,
                imagePaths,
            };
            const response = await OrderService.reviewOrderDetail(order.id, reviewItem.id, payload);
            if (response?.order_details) {
                setOrder((currentOrder) => ({
                    ...currentOrder,
                    ...response,
                }));
            } else {
                const submittedReview = response?.review ?? response ?? payload;

                setOrder((currentOrder) => ({
                    ...currentOrder,
                    order_details: (currentOrder?.order_details ?? []).map((item) => (
                        item.id === reviewItem.id
                            ? {
                                ...item,
                                review_id: submittedReview?.id ?? item.review_id ?? true,
                                review: submittedReview,
                            }
                            : item
                    )),
                }));
            }

            notification.success({
                message: "Đã gửi đánh giá",
                description: "Cảm ơn bạn đã chia sẻ trải nghiệm sản phẩm.",
            });
            closeReviewModal();
        } catch (err) {
            notification.error({
                message: "Không thể gửi đánh giá",
                description: err?.response?.data?.message || "Vui lòng thử lại sau.",
            });
        } finally {
            setIsSubmittingReview(false);
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

                <div className="flex flex-col items-start gap-xs sm:items-end">
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
                    {canCancelOrder ? (
                        <>
                            <button
                                className="mt-sm inline-flex items-center justify-center gap-xs rounded-lg border border-error px-md py-xs font-label-md text-label-md text-error transition-colors hover:bg-error/10 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60"
                                type="button"
                                disabled={isCancelling}
                                onClick={handleCancelOrder}
                            >
                                {isCancelling ? "Đang hủy đơn..." : "Hủy đơn hàng"}
                                <span className="material-symbols-outlined text-base">cancel</span>
                            </button>
                            {cancelError ? (
                                <p className="mt-xs max-w-xs text-body-sm text-error">{cancelError}</p>
                            ) : null}
                        </>
                    ) : null}
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

                    {order.status === "SHIPPING" || order.status === "COMPLETED" || order.status === "RETURNED" ? (
                        <div className="border border-outline-variant bg-surface-container-lowest p-md">
                            <div className="mb-sm flex items-center gap-xs">
                                <span className="material-symbols-outlined text-primary">route</span>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Theo dõi giao hàng GHN</h2>
                            </div>

                            {isTrackingLoading ? (
                                <div className="flex flex-col gap-xs">
                                    <div className="h-4 w-48 animate-pulse rounded bg-surface-container-high" />
                                    <div className="h-4 w-64 animate-pulse rounded bg-surface-container-high" />
                                </div>
                            ) : trackingError ? (
                                <p className="text-body-sm text-error">{trackingError}</p>
                            ) : trackingItems.length > 0 ? (
                                <div className="flex flex-col gap-sm">
                                    {trackingItems.map((item, index) => (
                                        <div key={`${item.status}-${item.updated_date}-${index}`} className="flex gap-sm">
                                            <div className="flex flex-col items-center">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary px-4 py-4">
                                                    <span className="material-symbols-outlined text-base">
                                                        {index === 0 ? "local_shipping" : "radio_button_checked"}
                                                    </span>
                                                </span>
                                                {index < trackingItems.length - 1 ? (
                                                    <span className="h-full w-px bg-outline-variant" />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 pb-sm">
                                                <p className="font-label-md text-label-md text-on-surface">
                                                    {ghnStatusMeta[item.status] || item.status || "Đang cập nhật"}
                                                </p>
                                                <p className="mt-1 text-body-sm text-on-surface-variant">
                                                    Cập nhật: {formatDateTime(item.updated_date)}
                                                </p>
                                                {/* <div className="mt-xs flex flex-wrap gap-xs text-body-sm text-on-surface-variant">
                                                    <span>Thanh toán GHN: {item.payment_type_id || "Đang cập nhật"}</span>
                                                    {item.trip_code ? <span>Chuyến: {item.trip_code}</span> : null}
                                                </div> */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-body-sm text-on-surface-variant">
                                    Chưa có dữ liệu theo dõi từ GHN.
                                </p>
                            )}
                        </div>
                    ) : null}

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
                                const canReviewItem = canReviewOrder && !item.review;

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
                                            {canReviewItem ? (
                                                <button
                                                    className="mt-sm inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-sm py-xs font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container active:opacity-70"
                                                    type="button"
                                                    onClick={() => openReviewModal(item)}
                                                >
                                                    Đánh giá
                                                    <span className="material-symbols-outlined text-base">star</span>
                                                </button>
                                            ) : null}
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

            <Modal
                centered
                confirmLoading={isSubmittingReview}
                okText="Gửi đánh giá"
                open={Boolean(reviewItem)}
                title="Đánh giá sản phẩm"
                onCancel={closeReviewModal}
                onOk={handleSubmitReview}
            >
                <div className="flex flex-col gap-md">
                    {reviewItem ? (
                        <div className="flex gap-sm rounded-md bg-surface-container-low p-sm">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-container-high">
                                {resolveImage(reviewItem.product_variant?.image) ? (
                                    <img
                                        alt={reviewItem.product_variant?.product?.name || "Sản phẩm"}
                                        className="h-full w-full object-cover"
                                        src={resolveImage(reviewItem.product_variant?.image)}
                                    />
                                ) : (
                                    <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-on-surface-variant">
                                        image
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-label-md text-label-md text-on-surface">
                                    {reviewItem.product_variant?.product?.name || `Sản phẩm #${reviewItem.product_variant_id}`}
                                </p>
                                <p className="mt-1 text-body-sm text-on-surface-variant">
                                    Mã chi tiết đơn: #{reviewItem.id}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-xs block font-label-md text-label-md text-on-surface">
                            Số sao
                        </label>
                        <Rate value={reviewRating} onChange={setReviewRating} />
                    </div>

                    <div>
                        <label className="mb-xs block font-label-md text-label-md text-on-surface">
                            Bình luận
                        </label>
                        <Input.TextArea
                            maxLength={1000}
                            rows={4}
                            showCount
                            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                            value={reviewComment}
                            onChange={(event) => setReviewComment(event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-xs block font-label-md text-label-md text-on-surface">
                            Hình ảnh
                        </label>
                        <Upload
                            accept="image/*"
                            beforeUpload={() => false}
                            fileList={reviewFiles}
                            listType="picture-card"
                            maxCount={5}
                            multiple
                            onChange={({ fileList }) => setReviewFiles(fileList.slice(0, 5))}
                        >
                            {reviewFiles.length >= 5 ? null : (
                                <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                                    <span className="material-symbols-outlined">add_photo_alternate</span>
                                    <span className="text-body-sm">Tải ảnh</span>
                                </div>
                            )}
                        </Upload>
                    </div>
                </div>
            </Modal>
        </main>
    );
};

export default OrderDetailPage;
