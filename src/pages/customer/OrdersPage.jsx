import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OrderService from "../../services/OrderService";
import {
    normalizeOrderStatus,
    ORDER_STATUS_META,
    ORDER_STATUS_OPTIONS,
} from "../../constants/orderStatus";

const PER_PAGE = 10;

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const formatDate = (dateString) => {
    if (!dateString) return "Đang cập nhật";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Đang cập nhật";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
};

const getOrderQuantity = (details = []) => details.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
);

const getPageNumbers = (currentPage, lastPage) => {
    const pages = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(lastPage, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    return pages;
};

const OrdersPage = () => {
    const [activeStatus, setActiveStatus] = useState("ALL");
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: PER_PAGE,
        total: 0,
        last_page: 1,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const pageNumbers = useMemo(
        () => getPageNumbers(pagination.current_page || currentPage, pagination.last_page || 1),
        [currentPage, pagination.current_page, pagination.last_page]
    );

    useEffect(() => {
        let isMounted = true;

        const fetchOrders = async () => {
            setIsLoading(true);
            setError("");

            try {
                const response = await OrderService.getOrders({
                    page: currentPage,
                    perPage: PER_PAGE,
                    status: activeStatus,
                });

                if (!isMounted) return;

                setOrders(response?.items ?? []);
                setPagination(response?.pagination ?? {
                    current_page: currentPage,
                    per_page: PER_PAGE,
                    total: response?.items?.length ?? 0,
                    last_page: 1,
                });
            } catch (err) {
                if (!isMounted) return;

                setOrders([]);
                setError(err?.response?.data?.message || "Không thể tải danh sách đơn hàng. Vui lòng thử lại.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrders();

        return () => {
            isMounted = false;
        };
    }, [activeStatus, currentPage]);

    const handleStatusChange = (status) => {
        setActiveStatus(status);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page < 1 || page > pagination.last_page || page === currentPage) return;
        setCurrentPage(page);
    };

    return (
        <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
            <div className="mb-lg">
                <h1 className="font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
                    Danh sách đơn hàng
                </h1>
                <p className="mt-xs max-w-2xl font-body-md text-body-md text-on-surface-variant">
                    Quản lý và theo dõi lịch sử mua sắm của bạn.
                </p>
            </div>

            <div className="mb-md flex gap-xs overflow-x-auto pb-xs">
                {ORDER_STATUS_OPTIONS.map((status) => (
                    <button
                        key={status.value}
                        className={`shrink-0 rounded-full px-md py-xs font-label-sm text-label-sm transition-colors ${activeStatus === status.value
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container"
                            }`}
                        type="button"
                        onClick={() => handleStatusChange(status.value)}>
                        {status.label}
                    </button>
                ))}
            </div>

            {error ? (
                <div className="mb-md border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-error">
                    {error}
                </div>
            ) : null}

            <div className="flex flex-col gap-sm">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={index}
                            className="animate-pulse border border-outline-variant bg-surface-container-lowest p-md">
                            <div className="mb-md h-5 w-48 rounded bg-surface-container-high" />
                            <div className="h-4 w-72 max-w-full rounded bg-surface-container-high" />
                            <div className="mt-md flex gap-xs">
                                <div className="h-12 w-12 rounded bg-surface-container-high" />
                                <div className="h-12 w-12 rounded bg-surface-container-high" />
                            </div>
                        </div>
                    ))
                ) : orders.length > 0 ? (
                    orders.map((order) => {
                        const normalizedStatus = normalizeOrderStatus(order.status);
                        const meta = ORDER_STATUS_META[normalizedStatus] || {
                            label: order.status || "Đang cập nhật",
                            className: "bg-surface-container-high text-on-surface-variant",
                        };
                        const details = order.order_details ?? [];
                        const quantity = getOrderQuantity(details);

                        return (
                            <article
                                key={order.id}
                                className="border border-outline-variant bg-surface-container-lowest p-md transition-all hover:border-primary hover:shadow-md">
                                <div className="mb-md flex flex-col gap-sm border-b border-surface-container-high pb-md sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-xs">
                                            <h2 className="font-headline-sm text-headline-sm text-on-surface">
                                                Đơn hàng #{order.id}
                                            </h2>
                                            <span className={`rounded px-xs py-[2px] text-[10px] font-bold uppercase ${meta.className}`}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <p className="mt-xs font-body-sm text-body-sm text-outline">
                                            Người nhận:{" "}
                                            <span className="font-medium text-on-surface">
                                                {order.full_name || "Đang cập nhật"}
                                            </span>
                                        </p>
                                        <p className="mt-1 font-body-sm text-body-sm text-outline">
                                            Ngày đặt:{" "}
                                            <span className="font-medium text-on-surface">{formatDate(order.created_at)}</span>
                                        </p>
                                    </div>

                                    <div className="text-left sm:text-right">
                                        <div className="font-headline-sm text-headline-sm text-primary">
                                            {formatCurrency(order.final_price)}
                                        </div>
                                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                                            {quantity > 0 ? `${quantity} sản phẩm` : "Đang cập nhật sản phẩm"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-sm">
                                        <div className="flex shrink-0">
                                            {details.slice(0, 3).map((item, index) => (
                                                <div
                                                    key={`${order.id}-${item.product_variant_id}-${index}`}
                                                    className={`h-12 w-12 overflow-hidden rounded border-2 border-surface-container-lowest bg-surface-container-high ${index > 0 ? "-ml-3" : ""
                                                        }`}>
                                                    {item.image ? (
                                                        <img
                                                            alt={`Sản phẩm ${item.product_variant_id}`}
                                                            className="h-full w-full object-cover"
                                                            src={item.image}
                                                        />
                                                    ) : (
                                                        <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-on-surface-variant">
                                                            image
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                                                Mã biến thể:{" "}
                                                <span className="text-on-surface">
                                                    {details[0]?.product_variant_id || "Đang cập nhật"}
                                                </span>
                                                {details.length > 1 ? ` và ${details.length - 1} sản phẩm khác` : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        className="inline-flex items-center justify-center gap-xs border border-primary px-md py-xs font-label-md text-label-md text-primary transition-colors hover:bg-secondary-container active:opacity-70"
                                        to={`/orders/${order.id}`}>
                                        Xem chi tiết
                                        <span className="material-symbols-outlined text-base">chevron_right</span>
                                    </Link>
                                </div>
                            </article>
                        );
                    })
                ) : (
                    <div className="border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-center">
                        <span className="material-symbols-outlined text-5xl text-primary">receipt_long</span>
                        <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
                            Chưa có đơn hàng phù hợp
                        </h2>
                        <p className="mt-xs text-body-md text-secondary">
                            Thử chọn trạng thái khác để xem lịch sử mua hàng.
                        </p>
                    </div>
                )}
            </div>

            {pagination.last_page > 1 ? (
                <div className="mt-lg flex items-center justify-center gap-sm">
                    <button
                        className="flex h-10 w-10 items-center justify-center border border-outline-variant text-on-surface-variant transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {pageNumbers.map((page) => (
                        <button
                            key={page}
                            className={`flex h-10 w-10 items-center justify-center font-label-md transition-colors ${page === currentPage
                                ? "bg-primary text-on-primary"
                                : "border border-outline-variant text-on-surface-variant hover:border-primary"
                                }`}
                            type="button"
                            onClick={() => handlePageChange(page)}>
                            {page}
                        </button>
                    ))}

                    <button
                        className="flex h-10 w-10 items-center justify-center border border-outline-variant text-on-surface-variant transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={currentPage >= pagination.last_page}
                        onClick={() => handlePageChange(currentPage + 1)}>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            ) : null}
        </main>
    );
};

export default OrdersPage;
