export const RETURN_STATUS_OPTIONS = [
    { value: "ALL", label: "Tất cả" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Đã từ chối" },
    { value: "cancelled", label: "Khách đã hủy" },
];

export const REFUND_STATUS_OPTIONS = [
    { value: "ALL", label: "Tất cả" },
    { value: "pending", label: "Chờ hoàn tiền" },
    { value: "approved", label: "Đã hoàn tiền" },
    { value: "rejected", label: "Đã từ chối" },
];

export const RETURN_STATUS_META = {
    pending: {
        label: "Chờ xử lý",
        className: "bg-amber-100 text-amber-700",
    },
    approved: {
        label: "Đã duyệt",
        className: "bg-blue-100 text-blue-700",
    },
    rejected: {
        label: "Đã từ chối",
        className: "bg-rose-100 text-rose-700",
    },
    cancelled: {
        label: "Khách đã hủy",
        className: "bg-slate-100 text-slate-700",
    },
};

export const REFUND_STATUS_META = {
    pending: {
        label: "Chờ hoàn tiền",
        className: "bg-amber-100 text-amber-700",
    },
    approved: {
        label: "Đã hoàn tiền",
        className: "bg-emerald-100 text-emerald-700",
    },
    rejected: {
        label: "Đã từ chối",
        className: "bg-rose-100 text-rose-700",
    },
};

export const normalizeReturnRefundStatus = (status) =>
    String(status ?? "").trim().toLowerCase();
