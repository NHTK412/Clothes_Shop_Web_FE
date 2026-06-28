import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { notification } from "antd";
import OrderService from "../../services/OrderService";

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const formatAddress = (address) => (
    [
        address?.specific_address,
        address?.ward_name,
        address?.district_name,
        address?.province_name,
    ].filter(Boolean).join(", ")
);

const CheckoutPage = () => {
    const { state } = useLocation();
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [note, setNote] = useState("");
    const [placingOrder, setPlacingOrder] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    // const [checkoutStep, setCheckoutStep] = useState("checkout");

    const cartItems = state?.cartItems || [];
    const selectedAddress = state?.selectedAddress || null;
    const subtotal = Number(state?.subtotal || 0);
    const shippingFee = Number(state?.shippingFee || 0);
    const voucherCode = state?.voucherCode || "";
    const discount = Number(state?.discount || 0);
    const shippingDiscount = Number(state?.shippingDiscount || 0);
    const total = Number(state?.total || 0);

    const itemCount = cartItems.reduce((count, item) => count + Number(item.quantity || 0), 0);

    const handleCreateOrder = async () => {
        if (!selectedAddress?.id) {
            notification.warning({
                message: "Chưa chọn địa chỉ",
                description: "Vui lòng quay lại giỏ hàng để chọn địa chỉ giao hàng.",
            });
            return;
        }

        setPlacingOrder(true);

        try {
            const order = await OrderService.createOrder({
                address_id: selectedAddress.id,
                gift_code: voucherCode || null,
                payment_method: paymentMethod,
            });

            if (paymentMethod === "VNPAY") {
                const payment = await OrderService.createVnpayPaymentUrl({
                    order_id: order.id,
                    bank_code: "VNBANK",
                    locale: "vn",
                });

                if (!payment?.payment_url) {
                    throw new Error("Không nhận được liên kết thanh toán VNPay.");
                }

                notification.info({
                    message: "Chuyển sang VNPay",
                    description: "Bạn sẽ được chuyển tới cổng thanh toán VNPay.",
                });
                window.location.assign(payment.payment_url);
                return;
            }

            setCreatedOrder(order);
            // setCheckoutStep("complete");
            notification.success({
                message: "Tạo đơn hàng thành công",
                description: `Đơn hàng #${order?.id || ""} đã được tạo.`,
            });
        } catch (e) {
            notification.error({
                message: "Không thể tạo đơn hàng",
                description: e?.response?.data?.message || e?.message || "Vui lòng thử lại sau.",
            });
        } finally {
            setPlacingOrder(false);
        }
    };

    if (!cartItems.length) {
        return (
            <main className="max-w-max-width mx-auto px-margin-mobile md:px-lg py-xl">
                <div className="border border-outline-variant bg-surface-container-lowest p-lg text-center">
                    <span className="material-symbols-outlined text-5xl text-primary">receipt_long</span>
                    <h1 className="mt-sm font-headline-md text-headline-md text-on-surface">
                        Chưa có dữ liệu thanh toán
                    </h1>
                    <p className="mt-xs text-body-md text-secondary">
                        Vui lòng quay lại giỏ hàng và tiến hành thanh toán lại.
                    </p>
                    <Link
                        className="mt-md inline-flex items-center gap-xs bg-primary px-md py-sm font-label-md text-on-primary"
                        to="/cart">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Quay lại giỏ hàng
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="max-w-max-width mx-auto px-margin-mobile md:px-lg py-xl">
            <div className="mb-lg flex flex-col gap-sm md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                        Thanh toán
                    </p>
                    <h1 className="mt-xs font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
                        Xác nhận đơn hàng
                    </h1>
                </div>
                <div className="flex items-center gap-xs text-body-sm text-secondary">
                    <Link className="transition-colors hover:text-primary hover:underline" to="/cart">
                        Giỏ hàng
                    </Link>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    {/* <span className={checkoutStep === "checkout" ? "font-label-md text-primary" : ""}>Thanh toán</span>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    <span className={checkoutStep === "complete" ? "font-label-md text-primary" : ""}>Hoàn tất</span> */}
                    <span className="font-label-md text-primary">Thanh toán</span>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    <span className="">Hoàn tất</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
                <section className="flex flex-col gap-md lg:col-span-7">
                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <div className="mb-sm flex items-center justify-between gap-sm">
                            <h2 className="flex items-center gap-xs font-headline-sm text-headline-sm text-on-surface">
                                <span className="material-symbols-outlined text-primary">location_on</span>
                                Địa chỉ nhận hàng
                            </h2>
                            <Link className="text-label-sm text-primary hover:underline" to="/cart">
                                Thay đổi
                            </Link>
                        </div>

                        {selectedAddress ? (
                            <div className="rounded-md bg-surface-container-low p-sm">
                                <div className="flex flex-wrap items-center gap-xs">
                                    <span className="font-label-md text-label-md text-on-surface">
                                        {selectedAddress.full_name}
                                    </span>
                                    <span className="text-body-sm text-secondary">| {selectedAddress.phone}</span>
                                    {selectedAddress.is_default && (
                                        <span className="rounded-full bg-secondary-container px-xs py-0.5 text-[11px] font-bold uppercase text-primary">
                                            Mặc định
                                        </span>
                                    )}
                                </div>
                                <p className="mt-xs text-body-md text-secondary">{formatAddress(selectedAddress)}</p>
                            </div>
                        ) : (
                            <div className="rounded-md border border-error bg-error/10 p-sm text-body-sm text-error">
                                Chưa chọn địa chỉ giao hàng. Vui lòng quay lại giỏ hàng để chọn địa chỉ.
                            </div>
                        )}
                    </div>

                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <h2 className="mb-sm flex items-center gap-xs font-headline-sm text-headline-sm text-on-surface">
                            <span className="material-symbols-outlined text-primary">payments</span>
                            Phương thức thanh toán
                        </h2>

                        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                            <label
                                className={`cursor-pointer rounded-md border p-sm transition-colors ${paymentMethod === "COD"
                                    ? "border-primary bg-primary/5"
                                    : "border-outline-variant bg-surface"
                                    }`}>
                                <div className="flex items-start gap-sm">
                                    <input
                                        checked={paymentMethod === "COD"}
                                        className="mt-1 accent-primary"
                                        name="payment_method"
                                        type="radio"
                                        onChange={() => setPaymentMethod("COD")}
                                    />
                                    <div>
                                        <p className="font-label-md text-label-md text-on-surface">
                                            Thanh toán khi nhận hàng
                                        </p>
                                        <p className="mt-1 text-body-sm text-secondary">
                                            Kiểm tra hàng trước khi thanh toán.
                                        </p>
                                    </div>
                                </div>
                            </label>

                            <label
                                className={`cursor-pointer rounded-md border p-sm transition-colors ${paymentMethod === "VNPAY"
                                    ? "border-primary bg-primary/5"
                                    : "border-outline-variant bg-surface"
                                    }`}>
                                <div className="flex items-start gap-sm">
                                    <input
                                        checked={paymentMethod === "VNPAY"}
                                        className="mt-1 accent-primary"
                                        name="payment_method"
                                        type="radio"
                                        onChange={() => setPaymentMethod("VNPAY")}
                                    />
                                    <div>
                                        <p className="font-label-md text-label-md text-on-surface">
                                            Thanh toán qua VNPay
                                        </p>
                                        <p className="mt-1 text-body-sm text-secondary">
                                            Thanh toán qua cổng thanh toán.
                                        </p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="border border-outline-variant bg-surface-container-lowest p-md">
                        <h2 className="mb-sm flex items-center gap-xs font-headline-sm text-headline-sm text-on-surface">
                            <span className="material-symbols-outlined text-primary">edit_note</span>
                            Ghi chú đơn hàng
                        </h2>
                        <textarea
                            className="min-h-28 w-full resize-none rounded-md border border-outline-variant bg-surface p-sm text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                            placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />
                    </div>

                    {/* {createdOrder && (
                        <div className="border border-primary bg-primary/5 p-md">
                            <h2 className="flex items-center gap-xs font-headline-sm text-headline-sm text-primary">
                                <span className="material-symbols-outlined">check_circle</span>
                                Đơn hàng đã được tạo
                            </h2>
                            <div className="mt-sm grid grid-cols-1 gap-sm text-body-sm text-secondary sm:grid-cols-2">
                                <p>
                                    Mã đơn: <span className="font-label-md text-on-surface">#{createdOrder.id}</span>
                                </p>
                                <p>
                                    Trạng thái: <span className="font-label-md text-on-surface">{createdOrder.status}</span>
                                </p>
                                <p>
                                    Mã GHN: <span className="font-label-md text-on-surface">{createdOrder.ghn_order_code || "Đang cập nhật"}</span>
                                </p>
                                <p>
                                    Thanh toán: <span className="font-label-md text-on-surface">{createdOrder.payment?.method}</span>
                                </p>
                            </div>
                        </div>
                    )} */}
                </section>

                <aside className="lg:col-span-5">
                    <div className="sticky top-24 border border-outline-variant bg-surface-container-lowest p-md">
                        <h2 className="mb-md font-headline-md text-headline-md text-on-surface">
                            Đơn hàng của bạn
                        </h2>

                        <div className="mb-md flex flex-col gap-sm border-b border-outline-variant pb-md">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-sm">
                                    <div className="h-20 w-16 shrink-0 overflow-hidden bg-surface-container">
                                        <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-label-md text-label-md text-on-surface">{item.name}</p>
                                        <p className="mt-1 text-body-sm text-secondary">
                                            {item.color && `Màu: ${item.color}`}
                                            {item.color && item.size ? " | " : ""}
                                            {item.size && `Size: ${item.size}`}
                                        </p>
                                        <div className="mt-xs flex items-center justify-between gap-xs">
                                            <span className="text-body-sm text-secondary">x{item.quantity}</span>
                                            <span className="font-label-md text-primary">
                                                {formatCurrency(item.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-sm border-b border-outline-variant pb-md">
                            <div className="flex justify-between text-body-md text-secondary">
                                <span>Tạm tính ({itemCount} sản phẩm)</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-body-md text-secondary">
                                <span>Phí vận chuyển</span>
                                <span>{formatCurrency(shippingFee)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-error font-label-sm">
                                    <span>Giảm giá{voucherCode ? ` (${voucherCode})` : ""}</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            {shippingDiscount > 0 && (
                                <div className="flex justify-between text-error font-label-sm">
                                    <span>Giảm phí vận chuyển ({voucherCode})</span>
                                    <span>-{formatCurrency(shippingDiscount)}</span>
                                </div>
                            )}
                        </div>

                        <div className="my-md flex items-center justify-between">
                            <span className="font-headline-sm text-on-surface">Tổng thanh toán</span>
                            <span className="font-headline-md text-primary">{formatCurrency(total)}</span>
                        </div>

                        <button
                            className="flex w-full items-center justify-center gap-xs bg-primary py-md font-label-md text-on-primary shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!selectedAddress || placingOrder || Boolean(createdOrder)}
                            type="button"
                            onClick={handleCreateOrder}>
                            <span>{placingOrder ? "Đang tạo đơn..." : createdOrder ? "Đã tạo đơn hàng" : "Đặt hàng"}</span>
                            <span className="material-symbols-outlined">check_circle</span>
                        </button>

                        {note && (
                            <p className="mt-sm text-center text-body-sm text-secondary">
                                Ghi chú sẽ được giữ ở giao diện checkout. API hiện tại chưa nhận trường ghi chú.
                            </p>
                        )}
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default CheckoutPage;
