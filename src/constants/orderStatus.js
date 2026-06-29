export const ORDER_STATUS = Object.freeze({
    PENDING_PAYMENT: "PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    SHIPPING: "SHIPPING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    RETURNED: "RETURNED",
});

export const ORDER_STATUS_OPTIONS = [
    { value: "ALL", label: "Tất cả" },
    { value: ORDER_STATUS.PENDING_PAYMENT, label: "Chờ thanh toán" },
    { value: ORDER_STATUS.CONFIRMED, label: "Đã xác nhận" },
    { value: ORDER_STATUS.SHIPPING, label: "Đang giao" },
    { value: ORDER_STATUS.COMPLETED, label: "Hoàn thành" },
    { value: ORDER_STATUS.CANCELLED, label: "Đã hủy" },
    { value: ORDER_STATUS.RETURNED, label: "Trả hàng" },
];

export const ORDER_STATUS_META = {
    [ORDER_STATUS.PENDING_PAYMENT]: {
        label: "Chờ thanh toán",
        className: "bg-amber-100 text-amber-700",
    },
    [ORDER_STATUS.CONFIRMED]: {
        label: "Đã xác nhận",
        className: "bg-blue-100 text-blue-700",
    },
    [ORDER_STATUS.SHIPPING]: {
        label: "Đang giao",
        className: "bg-cyan-100 text-cyan-700",
    },
    [ORDER_STATUS.COMPLETED]: {
        label: "Hoàn thành",
        className: "bg-emerald-100 text-emerald-700",
    },
    [ORDER_STATUS.CANCELLED]: {
        label: "Đã hủy",
        className: "bg-rose-100 text-rose-700",
    },
    [ORDER_STATUS.RETURNED]: {
        label: "Trả hàng",
        className: "bg-violet-100 text-violet-700",
    },
};

const ORDER_STATUS_VALUES = new Set(Object.values(ORDER_STATUS));

export const normalizeOrderStatus = (status) => {
    const normalized = String(status ?? "").trim().toUpperCase();

    if (normalized === "PENDING") return ORDER_STATUS.PENDING_PAYMENT;
    if (normalized === "PROCESSING") return ORDER_STATUS.CONFIRMED;

    return normalized;
};

export const normalizeOrderStatusFilter = (status) => {
    const normalized = normalizeOrderStatus(status);
    return ORDER_STATUS_VALUES.has(normalized) ? normalized : undefined;
};
