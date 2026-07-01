import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Drawer, Image, Modal, Upload, notification } from "antd";
import PageHeader from "../../components/admin/PageHeader";
import AdminActionButton from "../../components/admin/AdminActionButton";
import ReturnRefundService from "../../services/ReturnRefundService";
import UploadService from "../../services/UploadService";
import {
    REFUND_STATUS_META,
    REFUND_STATUS_OPTIONS,
    RETURN_STATUS_META,
    RETURN_STATUS_OPTIONS,
    normalizeReturnRefundStatus,
} from "../../constants/returnRefundStatus";

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const formatMoney = (value) => {
    if (value == null || value === "") return "-";
    const amount = Number(value);
    if (Number.isNaN(amount)) return String(value);
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    fallback;

const getCustomerName = (item) =>
    item?.customer?.name ||
    item?.customer?.full_name ||
    item?.order?.full_name ||
    "Khách hàng";

const getStatusMeta = (tab, status) => {
    const normalized = normalizeReturnRefundStatus(status);
    const map = tab === "returns" ? RETURN_STATUS_META : REFUND_STATUS_META;
    return map[normalized] ?? {
        label: status || "-",
        className: "bg-surface-container text-on-surface-variant",
    };
};

const StatusBadge = ({ tab, status }) => {
    const meta = getStatusMeta(tab, status);
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
            {meta.label}
        </span>
    );
};

const DetailSection = ({ icon, title, children }) => (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-white">
        <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
            <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </section>
);

const InfoItem = ({ label, value, children, full = false }) => (
    <div className={full ? "col-span-2" : ""}>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {label}
        </p>
        <div className="min-w-0 break-words text-sm font-medium text-on-surface">
            {children || value || "-"}
        </div>
    </div>
);

const AdminRefundManagementPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get("tab") === "returns" ? "returns" : "refunds";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("ALL");
    const [orderInput, setOrderInput] = useState(searchParams.get("order_id") || "");
    const [orderId, setOrderId] = useState(searchParams.get("order_id") || "");
    const [detailItem, setDetailItem] = useState(null);
    const [returnAction, setReturnAction] = useState(null);
    const [returnNote, setReturnNote] = useState("");
    const [refundAction, setRefundAction] = useState(null);
    const [refundNote, setRefundNote] = useState("");
    const [transferImage, setTransferImage] = useState("");
    const [nextRefundStatus, setNextRefundStatus] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const statusOptions = activeTab === "returns"
        ? RETURN_STATUS_OPTIONS
        : REFUND_STATUS_OPTIONS;

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: 15,
                status: status === "ALL" ? undefined : status,
                order_id: orderId || undefined,
            };
            const response = activeTab === "returns"
                ? await ReturnRefundService.getAdminReturnRequests(params)
                : await ReturnRefundService.getAdminRefunds(params);
            setItems(response.items);
            setPagination(response.pagination);
        } catch (error) {
            setItems([]);
            setPagination(null);
            notification.error({
                message: "Không thể tải dữ liệu",
                description: getErrorMessage(
                    error,
                    activeTab === "returns"
                        ? "Không thể tải danh sách yêu cầu trả hàng."
                        : "Không thể tải danh sách hoàn tiền.",
                ),
            });
        } finally {
            setLoading(false);
        }
    }, [activeTab, orderId, page, status]);

    useEffect(() => {
        // Fetching is the external synchronization performed by this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchItems();
    }, [fetchItems]);

    const counts = useMemo(
        () => items.reduce((result, item) => {
            const key = normalizeReturnRefundStatus(item.status);
            result[key] = (result[key] || 0) + 1;
            return result;
        }, {}),
        [items],
    );

    const changeTab = (tab) => {
        setActiveTab(tab);
        setStatus("ALL");
        setPage(1);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", tab);
        setSearchParams(nextParams);
    };

    const applyOrderFilter = (event) => {
        event.preventDefault();
        const value = orderInput.trim();
        setOrderId(value);
        setPage(1);
        const nextParams = new URLSearchParams(searchParams);
        if (value) nextParams.set("order_id", value);
        else nextParams.delete("order_id");
        nextParams.set("tab", activeTab);
        setSearchParams(nextParams);
    };

    const openReturnAction = (item, action) => {
        setReturnAction({ item, action });
        setReturnNote(item.note || "");
    };

    const submitReturnAction = async () => {
        if (!returnAction) return;
        if (!returnNote.trim()) {
            notification.warning({ message: "Vui lòng nhập ghi chú xử lý." });
            return;
        }
        setSubmitting(true);
        try {
            await ReturnRefundService.updateAdminReturnRequestStatus(
                returnAction.item.id,
                { status: returnAction.action, note: returnNote.trim() },
            );
            notification.success({
                message: returnAction.action === "approved"
                    ? "Đã duyệt yêu cầu trả hàng"
                    : "Đã từ chối yêu cầu trả hàng",
                description: returnAction.action === "approved"
                    ? "Vận đơn GHN chiều về và yêu cầu hoàn tiền đã được tạo."
                    : undefined,
            });
            setReturnAction(null);
            await fetchItems();
        } catch (error) {
            notification.error({
                message: "Không thể cập nhật yêu cầu",
                description: getErrorMessage(
                    error,
                    "Yêu cầu chưa được thay đổi. Vui lòng kiểm tra trạng thái và thử lại.",
                ),
            });
        } finally {
            setSubmitting(false);
        }
    };

    const openRefundAction = (item) => {
        setRefundAction(item);
        setRefundNote(item.note || "");
        setTransferImage(item.transfer_image || "");
        setNextRefundStatus("");
    };

    const uploadTransferImage = async (file) => {
        if (!file.type?.startsWith("image/")) {
            notification.warning({ message: "Vui lòng chọn một tệp ảnh." });
            return;
        }
        setUploading(true);
        try {
            const response = await UploadService.uploadImage(file);
            const imageUrl = response?.image_url || response?.url;
            if (!imageUrl) throw new Error("Upload response does not contain image_url");
            setTransferImage(imageUrl);
            notification.success({ message: "Đã tải ảnh chứng từ." });
        } catch (error) {
            notification.error({
                message: "Không thể tải ảnh",
                description: getErrorMessage(error, "Vui lòng thử lại với ảnh khác."),
            });
        } finally {
            setUploading(false);
        }
    };

    const submitRefundAction = async () => {
        if (!refundAction) return;
        if (nextRefundStatus === "rejected" && !refundNote.trim()) {
            notification.warning({
                message: "Vui lòng ghi lý do từ chối trong phần ghi chú.",
            });
            return;
        }
        setSubmitting(true);
        try {
            await ReturnRefundService.updateAdminRefund(refundAction.id, {
                note: refundNote.trim() || null,
                transfer_image: transferImage || null,
            });
            if (nextRefundStatus) {
                await ReturnRefundService.updateAdminRefundStatus(
                    refundAction.id,
                    nextRefundStatus,
                );
            }
            notification.success({
                message: nextRefundStatus === "approved"
                    ? "Đã xác nhận hoàn tiền"
                    : nextRefundStatus === "rejected"
                        ? "Đã từ chối hoàn tiền"
                        : "Đã cập nhật thông tin hoàn tiền",
            });
            setRefundAction(null);
            await fetchItems();
        } catch (error) {
            notification.error({
                message: "Không thể cập nhật hoàn tiền",
                description: getErrorMessage(
                    error,
                    "Dữ liệu chưa được cập nhật. Vui lòng kiểm tra và thử lại.",
                ),
            });
        } finally {
            setSubmitting(false);
        }
    };

    const total = pagination?.total ?? items.length;
    const lastPage = pagination?.last_page ?? 1;

    return (
        <main className="min-h-screen bg-surface pt-16">
            <div className="mx-auto w-full max-w-[1280px] space-y-lg p-lg">
                <PageHeader
                    title="Trả hàng & hoàn tiền"
                    subtitle="Duyệt yêu cầu trả hàng, theo dõi vận đơn chiều về và lưu chứng từ hoàn tiền cho khách."
                    actions={(
                        <button
                            type="button"
                            onClick={fetchItems}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary disabled:opacity-60"
                        >
                            <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
                                refresh
                            </span>
                            Làm mới
                        </button>
                    )}
                />

                <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                        <p className="text-sm text-on-surface-variant">Tổng kết quả</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{total}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                        <p className="text-sm text-on-surface-variant">
                            {activeTab === "returns" ? "Chờ xử lý" : "Chờ hoàn tiền"}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-amber-700">{counts.pending || 0}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                        <p className="text-sm text-on-surface-variant">
                            {activeTab === "returns" ? "Đã duyệt" : "Đã hoàn tiền"}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-emerald-700">{counts.approved || 0}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                        <p className="text-sm text-on-surface-variant">Đã từ chối</p>
                        <p className="mt-1 text-2xl font-bold text-rose-700">{counts.rejected || 0}</p>
                    </div>
                </div>

                <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                    <div className="border-b border-outline-variant p-md">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex rounded-lg bg-surface-container p-1">
                                <button
                                    type="button"
                                    onClick={() => changeTab("returns")}
                                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold sm:flex-none ${activeTab === "returns" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"}`}
                                >
                                    Yêu cầu trả hàng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeTab("refunds")}
                                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold sm:flex-none ${activeTab === "refunds" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"}`}
                                >
                                    Hoàn tiền
                                </button>
                            </div>
                            <form onSubmit={applyOrderFilter} className="flex w-full gap-2 xl:w-auto">
                                <input
                                    inputMode="numeric"
                                    value={orderInput}
                                    onChange={(event) => setOrderInput(event.target.value.replace(/\D/g, ""))}
                                    placeholder="Lọc theo ID đơn hàng"
                                    className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-white px-3 py-2 outline-none focus:border-primary xl:w-56"
                                />
                                <button className="rounded-lg border border-primary px-4 py-2 font-medium text-primary">
                                    Lọc
                                </button>
                            </form>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    onClick={() => {
                                        setStatus(option.value);
                                        setPage(1);
                                    }}
                                    className={`rounded-full px-4 py-2 text-sm font-medium ${status === option.value ? "bg-primary text-on-primary" : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>


                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[940px] text-left">
                            <thead className="border-b border-outline-variant bg-surface-container-low">
                                <tr className="text-xs uppercase tracking-wide text-on-surface-variant">
                                    <th className="px-md py-4">Mã</th>
                                    <th className="px-md py-4">Đơn hàng</th>
                                    <th className="px-md py-4">Khách hàng</th>
                                    <th className="px-md py-4">
                                        {activeTab === "returns" ? "Lý do trả hàng" : "Nội dung hoàn tiền"}
                                    </th>
                                    <th className="px-md py-4">Trạng thái</th>
                                    <th className="px-md py-4">Ngày tạo</th>
                                    <th className="w-[160px] px-md py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-md py-12 text-center text-on-surface-variant">
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-md py-12 text-center text-on-surface-variant">
                                            Không có dữ liệu phù hợp.
                                        </td>
                                    </tr>
                                ) : items.map((item) => (
                                    <tr key={item.id} className="align-middle hover:bg-surface-container-low/60">
                                        <td className="px-md py-4 font-semibold text-primary">
                                            #{activeTab === "returns" ? "RT" : "RF"}-{item.id}
                                        </td>
                                        <td className="px-md py-4">
                                            <Link
                                                to={`/admin/orders/${item.order_id}`}
                                                className="font-semibold text-on-surface hover:text-primary"
                                            >
                                                #ORD-{item.order_id}
                                            </Link>
                                            
                                        </td>
                                        <td className="px-md py-4">
                                            <p className="font-medium text-on-surface">{getCustomerName(item)}</p>
                                        </td>
                                        <td className="max-w-[300px] px-md py-4">
                                            <p className="line-clamp-2 text-sm text-on-surface">
                                                {item.reason || item.note || "-"}
                                            </p>
                                        </td>
                                        <td className="px-md py-4">
                                            <StatusBadge tab={activeTab} status={item.status} />
                                        </td>
                                        <td className="whitespace-nowrap px-md py-4 text-sm text-on-surface-variant">
                                            {formatDateTime(item.created_at)}
                                        </td>
                                        <td className="px-md py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <AdminActionButton
                                                    icon="visibility"
                                                    label="Xem chi tiết"
                                                    onClick={() => setDetailItem(item)}
                                                />
                                                {activeTab === "returns" && normalizeReturnRefundStatus(item.status) === "pending" && (
                                                    <>
                                                        <AdminActionButton
                                                            icon="check_circle"
                                                            label="Duyệt yêu cầu"
                                                            tone="success"
                                                            onClick={() => openReturnAction(item, "approved")}
                                                        />
                                                        <AdminActionButton
                                                            icon="cancel"
                                                            label="Từ chối yêu cầu"
                                                            tone="danger"
                                                            onClick={() => openReturnAction(item, "rejected")}
                                                        />
                                                    </>
                                                )}
                                                {activeTab === "refunds" && (
                                                    <AdminActionButton
                                                        icon={normalizeReturnRefundStatus(item.status) === "pending" ? "payments" : "edit"}
                                                        label={normalizeReturnRefundStatus(item.status) === "pending" ? "Xử lý hoàn tiền" : "Cập nhật thông tin"}
                                                        onClick={() => openRefundAction(item)}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-outline-variant p-md sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-on-surface-variant">
                            Hiển thị {items.length} trên tổng {total} kết quả
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((value) => Math.max(1, value - 1))}
                                disabled={page <= 1 || loading}
                                className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <span className="px-2 text-sm">Trang {pagination?.current_page ?? page}/{lastPage}</span>
                            <button
                                type="button"
                                onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
                                disabled={page >= lastPage || loading}
                                className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <Drawer
                open={Boolean(detailItem)}
                onClose={() => setDetailItem(null)}
                placement="right"
                width="min(620px, 100vw)"
                title={(
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-primary">
                            {activeTab === "returns" ? "Yêu cầu trả hàng" : "Yêu cầu hoàn tiền"}
                        </p>
                        <p className="mt-1 text-lg font-bold text-on-surface">
                            #{activeTab === "returns" ? "RT" : "RF"}-{detailItem?.id}
                        </p>
                    </div>
                )}
                extra={detailItem ? (
                    <StatusBadge tab={activeTab} status={detailItem.status} />
                ) : null}
                styles={{
                    body: { padding: 0, background: "#f7f9fb" },
                    footer: { padding: "12px 20px" },
                }}
                footer={detailItem ? (
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setDetailItem(null)}
                            className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold leading-none text-on-surface-variant transition-colors hover:bg-surface-container sm:w-auto sm:min-w-[80px]"
                        >
                            Đóng
                        </button>
                        {activeTab === "returns" && normalizeReturnRefundStatus(detailItem.status) === "pending" ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const item = detailItem;
                                        setDetailItem(null);
                                        openReturnAction(item, "rejected");
                                    }}
                                    className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border border-error bg-white px-4 text-sm font-semibold leading-none text-error transition-colors hover:bg-error-container/30 sm:w-auto sm:min-w-[100px]"
                                >
                                    Từ chối
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const item = detailItem;
                                        setDetailItem(null);
                                        openReturnAction(item, "approved");
                                    }}
                                    className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold leading-none text-on-primary transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[130px]"
                                >
                                    Duyệt yêu cầu
                                </button>
                            </>
                        ) : null}
                        {activeTab === "refunds" ? (
                            <button
                                type="button"
                                onClick={() => {
                                    const item = detailItem;
                                    setDetailItem(null);
                                    openRefundAction(item);
                                }}
                                className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold leading-none text-on-primary transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[150px]"
                            >
                                {normalizeReturnRefundStatus(detailItem.status) === "pending"
                                    ? "Xử lý hoàn tiền"
                                    : "Cập nhật thông tin"}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            >
                {detailItem && (
                    <div className="space-y-4 p-5">
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-700 p-5 text-white shadow-sm">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                            <div className="relative">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                                            Đơn hàng liên quan
                                        </p>
                                        <Link
                                            to={`/admin/orders/${detailItem.order_id}`}
                                            className="mt-1 inline-flex items-center gap-1 text-xl font-bold text-white hover:underline"
                                        >
                                            #ORD-{detailItem.order_id}
                                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                        </Link>
                                    </div>
                                    <span className="material-symbols-outlined text-4xl text-white/70">
                                        {activeTab === "returns" ? "assignment_return" : "payments"}
                                    </span>
                                </div>
                                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[17px]">calendar_today</span>
                                        {formatDateTime(detailItem.created_at)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[17px]">credit_card</span>
                                        {detailItem.order?.payment_method || "Chưa cập nhật"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DetailSection icon="person" title="Thông tin khách hàng">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label="Khách hàng" value={getCustomerName(detailItem)} full />
                                <InfoItem
                                    label="Email"
                                    value={detailItem.customer?.email}
                                />
                                <InfoItem
                                    label="Số điện thoại"
                                    value={detailItem.customer?.phone || detailItem.order?.phone}
                                />
                            </div>
                        </DetailSection>

                        <DetailSection
                            icon={activeTab === "returns" ? "description" : "account_balance_wallet"}
                            title={activeTab === "returns" ? "Nội dung yêu cầu" : "Thông tin hoàn tiền"}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label="Lý do" value={detailItem.reason} full />
                                <InfoItem label="Ghi chú xử lý" full>
                                    {detailItem.note ? (
                                        <div className="rounded-lg border-l-4 border-primary bg-secondary-container/50 p-3 font-normal leading-6">
                                            {detailItem.note}
                                        </div>
                                    ) : (
                                        <span className="font-normal text-on-surface-variant">Chưa có ghi chú</span>
                                    )}
                                </InfoItem>
                            </div>
                        </DetailSection>

                        {activeTab === "returns" ? (
                            <DetailSection icon="local_shipping" title="Vận chuyển chiều về">
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoItem
                                        label="Mã vận đơn GHN"
                                        value={detailItem.ghn_order_code}
                                        full
                                    />
                                    <InfoItem
                                        label="Phí vận chuyển"
                                        value={formatMoney(detailItem.ghn_fee)}
                                    />
                                    <InfoItem
                                        label="Dự kiến nhận hàng"
                                        value={formatDateTime(detailItem.expected_delivery_at)}
                                    />
                                    <InfoItem
                                        label="Mã hoàn tiền"
                                        value={detailItem.refund_id ? `#RF-${detailItem.refund_id}` : "-"}
                                    />
                                    <InfoItem label="Trạng thái hoàn tiền">
                                        {detailItem.refund_status ? (
                                            <StatusBadge
                                                tab="refunds"
                                                status={detailItem.refund_status}
                                            />
                                        ) : (
                                            "-"
                                        )}
                                    </InfoItem>
                                </div>
                            </DetailSection>
                        ) : (
                            <DetailSection icon="receipt_long" title="Chứng từ chuyển khoản">
                                {detailItem.transfer_image ? (
                                    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-2">
                                        <Image
                                            src={detailItem.transfer_image}
                                            alt="Chứng từ chuyển khoản"
                                            width="100%"
                                            className="max-h-72 rounded-lg object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-8 text-center">
                                        <span className="material-symbols-outlined text-4xl text-outline">image_not_supported</span>
                                        <p className="mt-2 text-sm font-medium text-on-surface-variant">
                                            Chưa có ảnh chứng từ
                                        </p>
                                    </div>
                                )}
                            </DetailSection>
                        )}
                    </div>
                )}
            </Drawer>

            <Modal
                open={Boolean(returnAction)}
                onCancel={() => !submitting && setReturnAction(null)}
                onOk={submitReturnAction}
                confirmLoading={submitting}
                okText={returnAction?.action === "approved" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
                cancelText="Hủy"
                okButtonProps={{ danger: returnAction?.action === "rejected" }}
                title={returnAction?.action === "approved" ? "Duyệt yêu cầu trả hàng" : "Từ chối yêu cầu trả hàng"}
            >
                {returnAction?.action === "approved" && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Backend sẽ gọi GHN tạo vận đơn lấy hàng chiều về. Nếu GHN lỗi, yêu cầu vẫn giữ trạng thái chờ xử lý.
                    </div>
                )}
                <label className="block text-sm font-medium text-on-surface">
                    Ghi chú xử lý <span className="text-error">*</span>
                    <textarea
                        rows="4"
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                        placeholder={returnAction?.action === "approved"
                            ? "Nội dung đã thống nhất với khách..."
                            : "Lý do từ chối yêu cầu..."}
                        className="mt-2 w-full resize-y rounded-lg border border-outline-variant p-3 outline-none focus:border-primary"
                    />
                </label>
            </Modal>

            <Modal
                open={Boolean(refundAction)}
                onCancel={() => !submitting && !uploading && setRefundAction(null)}
                onOk={submitRefundAction}
                confirmLoading={submitting}
                okText={nextRefundStatus ? "Lưu và cập nhật trạng thái" : "Lưu thông tin"}
                cancelText="Hủy"
                width={640}
                title={`Xử lý hoàn tiền #RF-${refundAction?.id ?? ""}`}
            >
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    Xác nhận số tiền và phương án hoàn với khách bên ngoài hệ thống, sau đó ghi lại nội dung bên dưới.
                </div>
                <label className="block text-sm font-medium text-on-surface">
                    Ghi chú / phương án hoàn tiền
                    <textarea
                        rows="4"
                        value={refundNote}
                        onChange={(event) => setRefundNote(event.target.value)}
                        placeholder="Ví dụ: Đã chuyển khoản theo thông tin khách cung cấp..."
                        className="mt-2 w-full resize-y rounded-lg border border-outline-variant p-3 outline-none focus:border-primary"
                    />
                </label>
                <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-on-surface">Ảnh chuyển khoản</p>
                    {transferImage ? (
                        <div className="flex items-center gap-3 rounded-lg border border-outline-variant p-3">
                            <img src={transferImage} alt="Chứng từ chuyển khoản" className="h-16 w-16 rounded object-cover" />
                            <a href={transferImage} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary">
                                {transferImage}
                            </a>
                            <button
                                type="button"
                                onClick={() => setTransferImage("")}
                                className="rounded-lg p-2 text-error hover:bg-error-container"
                                title="Xóa ảnh"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ) : (
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                uploadTransferImage(file);
                                return Upload.LIST_IGNORE;
                            }}
                            disabled={uploading}
                        >
                            <button
                                type="button"
                                disabled={uploading}
                                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
                            >
                                <span className={`material-symbols-outlined ${uploading ? "animate-spin" : ""}`}>
                                    {uploading ? "progress_activity" : "upload"}
                                </span>
                                {uploading ? "Đang tải ảnh..." : "Chọn ảnh chứng từ"}
                            </button>
                        </Upload>
                    )}
                </div>
                {normalizeReturnRefundStatus(refundAction?.status) === "pending" && (
                    <div className="mt-5">
                        <p className="mb-2 text-sm font-medium text-on-surface">Cập nhật trạng thái</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {[
                                { value: "", label: "Chỉ lưu thông tin" },
                                { value: "approved", label: "Đã hoàn tiền" },
                                { value: "rejected", label: "Từ chối hoàn tiền" },
                            ].map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    onClick={() => setNextRefundStatus(option.value)}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${nextRefundStatus === option.value ? "border-primary bg-secondary-container text-primary" : "border-outline-variant text-on-surface-variant"}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {nextRefundStatus === "approved" && (
                            <p className="mt-2 text-xs text-amber-700">
                                Sau khi xác nhận, payment của đơn hàng sẽ chuyển thành REFUNDED và không thể đổi lại qua API này.
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </main>
    );
};

export default AdminRefundManagementPage;
