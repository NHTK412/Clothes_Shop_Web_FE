import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import CartService from "../../services/CartService";
import AddressService from "../../services/AddressService";
import AddressSelectionModal from "../../components/client/AddressSelectionModal";
import { notification } from "antd";
import VoucherService from "../../services/VoucherService";
const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const getAttributeDisplay = (attributes = [], type) => (
    attributes.find((attribute) => attribute.type === type)?.display_value || ""
);

const formatAddress = (address) => (
    [
        address?.specific_address,
        address?.ward_name,
        address?.district_name,
        address?.province_name,
    ].filter(Boolean).join(", ")
);

const normalizeCartItem = (item) => {
    const originalPrice = Number(item.price ?? item.unit_price ?? item.original_price ?? 0);
    const discountAmount = Number(item.discount_price ?? item.unit_discount_price ?? 0);
    const price = Math.max(originalPrice - discountAmount, 0);

    return {
        id: item.cart_item_id,
        productVariantId: item.product_variant_id,
        name: item.product_name,
        color: getAttributeDisplay(item.attributes, "color"),
        size: getAttributeDisplay(item.attributes, "size"),
        material: getAttributeDisplay(item.attributes, "material"),
        price,
        originalPrice,
        discountAmount,
        quantity: Number(item.quantity) || 1,
        image: item.image,
    };
};

const CartDetailPage = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingItemId, setUpdatingItemId] = useState(null);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [shippingFee, setShippingFee] = useState(0);
    const [shippingFeeLoading, setShippingFeeLoading] = useState(false);
    const [shippingFeeError, setShippingFeeError] = useState("");

    const [voucherCode, setVoucherCode] = useState("");
    const [voucherApplied, setVoucherApplied] = useState("");
    const [discount, setDiscount] = useState(0);
    const [shippingDiscount, setShippingDiscount] = useState(0);


    useEffect(() => {
        let mounted = true;

        const fetchCartItems = async () => {
            setLoading(true);
            setError("");

            try {
                const items = await CartService.getItems();
                if (!mounted) return;
                setCartItems((items || []).map(normalizeCartItem));
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || "Không thể tải giỏ hàng. Vui lòng thử lại sau.");
                setCartItems([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        const fetchAddressDefault = async () => {
            setShippingFeeLoading(true);
            try {
                const items = await AddressService.getAddresses();

                const defaultAddress = (items || []).find((address) => address.is_default);
                if (defaultAddress && mounted) {
                    setSelectedAddress(defaultAddress);
                }
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || "Không thể tải giỏ hàng. Vui lòng thử lại sau.");
                setCartItems([]);
            }
            finally {
                if (mounted) setShippingFeeLoading(false);
            }
        }

        fetchCartItems();
        fetchAddressDefault();

        return () => {
            mounted = false;
        };
    }, []);

    const subtotal = useMemo(
        () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
        [cartItems]
    );
    // const discount = 0;
    const total = Math.max(subtotal + shippingFee - discount - shippingDiscount, 0);

    useEffect(() => {
        let mounted = true;

        const fetchShippingFee = async () => {
            if (!selectedAddress || cartItems.length === 0) {
                setShippingFee(0);
                setShippingFeeError("");
                return;
            }

            setShippingFeeLoading(true);
            setShippingFeeError("");

            try {
                const wardIdV2 = selectedAddress.ward_code;
                const districtId = selectedAddress.district_id ?? selectedAddress.province_id;

                if (!wardIdV2 || !districtId) {
                    throw new Error("Thiếu thông tin phường/xã hoặc khu vực giao hàng để tính phí vận chuyển.");
                }

                const fee = await AddressService.getShippingFee(
                    wardIdV2,
                    districtId
                );

                if (!mounted) return;
                setShippingFee(fee);
            } catch (e) {
                if (!mounted) return;
                setShippingFee(0);
                setShippingFeeError(e?.response?.data?.message || e?.message || "Không thể tính phí vận chuyển.");
            } finally {
                if (mounted) setShippingFeeLoading(false);
            }
        };

        fetchShippingFee();

        return () => {
            mounted = false;
        };
    }, [cartItems.length, selectedAddress]);

    const updateQuantity = async (itemId, nextQuantity) => {
        setUpdatingItemId(itemId);
        setError("");

        try {
            const items = await CartService.updateItemQuantity(itemId, nextQuantity);
            setCartItems((items || []).map(normalizeCartItem));
            window.dispatchEvent(new Event("cart:updated"));
        } catch (e) {
            setError(e?.response?.data?.message || "Không thể cập nhật số lượng. Vui lòng thử lại sau.");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const removeItem = (itemId) => {
        updateQuantity(itemId, 0);
    };

    const handleCheckout = () => {
        navigate("/checkout", {
            state: {
                cartItems,
                selectedAddress,
                subtotal,
                shippingFee,
                voucherCode: voucherApplied,
                discount,
                shippingDiscount,
                total,
            },
        });
    };

    const handleAddVoucher = (async () => {
        try {
            const voucher = await VoucherService.getVoucherByCode(voucherCode);
            // Handle the voucher logic here

            if (voucher) {
                setVoucherApplied(voucher.code);
                switch (voucher.discount_type) {
                    case "ORDER": {
                        const discountValue = voucher?.max_discount_amount ?
                            Math.min(Number(voucher?.discount_amount) / 100 * subtotal, Number(voucher?.max_discount_amount))
                            :
                            Number(voucher?.discount_amount) / 100 * subtotal;
                        setShippingDiscount(0);
                        setDiscount(discountValue);
                        break;
                    }
                    case "SHIPPING": {
                        // const shippingDiscountValue = Math.min(Number(voucher?.discount_amount) / 100 * shippingFee, Number(voucher?.max_discount_amount));
                        const shippingDiscountValue = voucher?.max_discount_amount ?
                            Math.min(Number(voucher?.discount_amount) / 100 * shippingFee, Number(voucher?.max_discount_amount))
                            :
                            Number(voucher?.discount_amount) / 100 * shippingFee;
                        setDiscount(0);
                        setShippingDiscount(shippingDiscountValue);
                        break;
                    }
                    default:
                        notification.error({
                            message: "Lỗi",
                            description: "Loại giảm giá không hợp lệ.",
                        });
                        break;
                }
            }
            setVoucherCode("");

            //             {
            //   "status": 200,
            //   "success": true,
            //   "message": null,
            //   "data": {
            //     "id": 1,
            //     "code": "GIAM50",
            //     "description": "Nhân kịp khai trương giảm giá 50% cho giá trị đơn hàng",
            //     "discount_amount": "50.00",
            //     "max_discount_amount": "2000000.00",
            //     "discount_type": "ORDER",
            //     "is_active": 1,
            //     "usage_limit": 100,
            //     "expiry_date": "2026-06-30",
            //     "created_at": null,
            //     "updated_at": null
            //   }
            // }

        } catch (error) {
            console.error("Error applying voucher:", error);
            notification.error({
                message: "Lỗi",
                description: "Không thể áp dụng mã giảm giá. Vui lòng thử lại sau.",
            });
        }
    });


    return (
        <main className="max-w-max-width mx-auto px-margin-mobile md:px-lg py-xl">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-xl text-primary">
                Giỏ hàng của bạn
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                <section className="lg:col-span-7 flex flex-col gap-md">
                    {loading ? (
                        <div className="bg-surface-container-lowest border border-outline-variant p-lg text-center">
                            <span className="material-symbols-outlined text-5xl text-primary animate-pulse">shopping_cart</span>
                            <p className="mt-sm font-body-md text-body-md text-secondary">Đang tải giỏ hàng...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-surface-container-lowest border border-outline-variant p-lg text-center">
                            <span className="material-symbols-outlined text-5xl text-error">error</span>
                            <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
                                Có lỗi xảy ra
                            </h2>
                            <p className="mt-xs text-secondary font-body-md">{error}</p>
                        </div>
                    ) : cartItems.length > 0 ? (
                        cartItems.map((item) => (
                            <article
                                key={item.id}
                                className="bg-surface-container-lowest border border-outline-variant p-md flex flex-col sm:flex-row gap-md transition-all hover:border-primary hover:shadow-sm">
                                <div className="w-full sm:w-32 h-40 flex-shrink-0 bg-surface-container overflow-hidden">
                                    <img alt={item.name} className="w-full h-full object-cover" src={item.image} />
                                </div>

                                <div className="flex-grow flex flex-col justify-between py-xs">
                                    <div>
                                        <div className="flex justify-between items-start gap-sm">
                                            <h3 className="font-headline-sm text-headline-sm text-on-surface">
                                                {item.name}
                                            </h3>
                                            <button
                                                className="text-outline hover:text-error disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                disabled={updatingItemId === item.id}
                                                type="button"
                                                onClick={() => removeItem(item.id)}>
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>
                                        <p className="text-secondary font-label-sm mt-xs">
                                            Màu sắc: {item.color}
                                        </p>
                                        <p className="text-secondary font-label-sm">Kích cỡ: {item.size}</p>
                                        {item.material && (
                                            <p className="text-secondary font-label-sm">
                                                Chất liệu: {item.material}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-end mt-md">
                                        <div className="flex items-center border border-outline-variant bg-surface-container-low">
                                            <button
                                                className="w-8 h-8 flex items-center justify-center hover:bg-outline-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                disabled={updatingItemId === item.id}
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                -
                                            </button>
                                            <input
                                                className="w-10 text-center bg-transparent border-none focus:ring-0 font-label-md"
                                                readOnly
                                                type="text"
                                                value={item.quantity}
                                            />
                                            <button
                                                className="w-8 h-8 flex items-center justify-center hover:bg-outline-variant disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                disabled={updatingItemId === item.id}
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                +
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            {item.originalPrice > item.price && (
                                                <div className="text-body-sm text-secondary line-through">
                                                    {formatCurrency(item.originalPrice * item.quantity)}
                                                </div>
                                            )}
                                            <span className="font-headline-sm text-primary">
                                                {formatCurrency(item.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="bg-surface-container-lowest border border-outline-variant p-lg text-center">
                            <span className="material-symbols-outlined text-5xl text-primary">shopping_cart</span>
                            <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
                                Giỏ hàng đang trống
                            </h2>
                            <p className="mt-xs text-secondary font-body-md">
                                Hãy thêm vài sản phẩm yêu thích vào giỏ hàng của bạn.
                            </p>
                        </div>
                    )}

                    <div className="mt-sm flex items-center">
                        <Link className="flex items-center text-primary font-label-md hover:underline" to="/products">
                            <span className="material-symbols-outlined mr-xs">arrow_back</span>
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                </section>

                <aside className="lg:col-span-5">
                    <div className="bg-surface-container-lowest border border-outline-variant p-md sticky top-24">
                        <h2 className="font-headline-md text-headline-md text-on-surface mb-md">
                            Tóm tắt đơn hàng
                        </h2>

                        <div className="mb-md border border-outline-variant bg-surface p-sm">
                            <div className="mb-xs flex items-center justify-between gap-sm">
                                <div className="flex items-center gap-xs text-on-surface">
                                    <span className="material-symbols-outlined text-primary">location_on</span>
                                    <span className="font-label-md text-label-md">Địa chỉ giao hàng</span>
                                </div>
                                <button
                                    className="text-label-sm text-primary hover:underline disabled:opacity-60"
                                    disabled={cartItems.length === 0}
                                    type="button"
                                    onClick={() => setAddressModalOpen(true)}>
                                    {selectedAddress ? "Thay đổi" : "Chọn địa chỉ"}
                                </button>
                            </div>
                            {selectedAddress ? (
                                <div className="text-body-sm text-secondary">
                                    <p className="font-label-md text-on-surface">
                                        {selectedAddress.full_name} - {selectedAddress.phone}
                                    </p>
                                    <p className="mt-1">{formatAddress(selectedAddress)}</p>
                                </div>
                            ) : (
                                <p className="text-body-sm text-secondary">
                                    Chọn địa chỉ để chuẩn bị tính phí giao hàng tự động.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-sm border-b border-outline-variant pb-md mb-md">
                            <div className="flex justify-between text-secondary font-body-md">
                                <span>Tạm tính</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-secondary font-body-md">
                                <span>Phí vận chuyển</span>
                                <span>
                                    {shippingFeeLoading ? "Đang tính..." : formatCurrency(cartItems.length > 0 ? shippingFee : 0)}
                                </span>
                            </div>
                            {shippingFeeError && (
                                <p className="text-body-sm text-error">{shippingFeeError}</p>
                            )}
                            { voucherApplied && discount > 0 && (
                                <div className="flex justify-between text-error font-label-sm">
                                    <span>Mã giảm giá ({voucherApplied})</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            {voucherApplied && shippingDiscount > 0 && (
                                <div className="flex justify-between text-error font-label-sm">
                                    <span>Giảm phí vận chuyển ({voucherApplied})</span>
                                    <span>-{formatCurrency(shippingDiscount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-lg">
                                <span className="font-headline-sm text-on-surface">Tổng cộng</span>
                                <span className="font-headline-md text-primary">
                                    {formatCurrency(cartItems.length > 0 ? total : 0)}
                                </span>
                            </div>

                            {/* {discount > 0 && ( */}
                            <div className="mb-lg">
                                <label className="block text-label-sm text-secondary mb-xs uppercase tracking-wider">
                                    Mã giảm giá
                                </label>
                                <div className="flex gap-xs">
                                    <input
                                        className="flex-grow bg-surface border border-outline-variant p-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="Nhập mã..."
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value)}
                                    />
                                    <button
                                        className="bg-secondary-container text-primary font-label-md px-md py-sm hover:bg-secondary-fixed transition-colors"
                                        type="button" onClick={handleAddVoucher}>
                                        Áp dụng
                                    </button>
                                </div>
                            </div>
                            {/* )} */}

                            <button
                                className="w-full bg-primary text-on-primary font-label-md py-md shadow-sm hover:bg-on-primary-fixed-variant transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={cartItems.length === 0 || shippingFeeLoading || !selectedAddress}
                                type="button"
                                onClick={handleCheckout}>
                                <span>Tiến hành thanh toán</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>

                            <div className="mt-md flex flex-col gap-sm">
                                <div className="flex items-center gap-xs text-secondary text-body-sm">
                                    <span className="material-symbols-outlined text-sm">verified_user</span>
                                    Thanh toán an toàn 100%
                                </div>
                                <div className="flex items-center gap-xs text-secondary text-body-sm">
                                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                                    Giao hàng miễn phí cho đơn từ 2tr
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <AddressSelectionModal
                open={addressModalOpen}
                selectedAddressId={selectedAddress?.id}
                onClose={() => setAddressModalOpen(false)}
                onSelect={setSelectedAddress}
            />
        </main>
    );
};

export default CartDetailPage;
