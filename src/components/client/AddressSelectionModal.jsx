import { useCallback, useEffect, useMemo, useState } from "react";
import AddressService from "../../services/AddressService";

const emptyForm = {
    province_id: "",
    province_name: "",
    ward_code: "",
    ward_name: "",
    specific_address: "",
    full_name: "",
    phone: "",
    is_default: false,
};

const formatAddress = (address) => (
    [
        address?.specific_address,
        address?.ward_name,
        address?.district_name,
        address?.province_name,
    ].filter(Boolean).join(", ")
);

const AddressSelectionModal = ({ open, selectedAddressId, onClose, onSelect }) => {
    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState(selectedAddressId || null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [provinces, setProvinces] = useState([]);
    const [wards, setWards] = useState([]);

    const selectedAddress = useMemo(
        () => addresses.find((address) => String(address.id) === String(selectedId)) || null,
        [addresses, selectedId]
    );

    const loadAddresses = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const items = await AddressService.getAddresses();
            setAddresses(items);

            const nextSelected =
                items.find((address) => String(address.id) === String(selectedAddressId)) ||
                items.find((address) => address.is_default) ||
                items[0] ||
                null;

            setSelectedId(nextSelected?.id || null);
        } catch (e) {
            setError(e?.response?.data?.message || "Không thể tải danh sách địa chỉ.");
        } finally {
            setLoading(false);
        }
    }, [selectedAddressId]);

    useEffect(() => {
        if (!open) return;

        const timer = window.setTimeout(() => {
            loadAddresses();
            AddressService.getProvinces()
                .then(setProvinces)
                .catch(() => setProvinces([]));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadAddresses, open]);

    useEffect(() => {
        if (!form.province_id) return;

        AddressService.getWards(form.province_id)
            .then(setWards)
            .catch(() => setWards([]));
    }, [form.province_id]);

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const openCreateForm = () => {
        setEditingAddressId(null);
        setForm({
            ...emptyForm,
            is_default: addresses.length === 0,
        });
        setFormOpen(true);
    };

    const openEditForm = (address) => {
        setEditingAddressId(address.id);
        setForm({
            province_id: address.province_id || "",
            province_name: address.province_name || "",
            ward_code: address.ward_code || "",
            ward_name: address.ward_name || "",
            specific_address: address.specific_address || "",
            full_name: address.full_name || "",
            phone: address.phone || "",
            is_default: Boolean(address.is_default),
        });
        setFormOpen(true);
    };

    const handleProvinceChange = (provinceId) => {
        const province = provinces.find((item) => String(item.province_id) === String(provinceId));

        setForm((current) => ({
            ...current,
            province_id: province?.province_id || "",
            province_name: province?.province_name || "",
            ward_code: "",
            ward_name: "",
        }));
        setWards([]);
    };

    const handleWardChange = (wardCode) => {
        const ward = wards.find((item) => String(item.ward_code || item.WardCode) === String(wardCode));

        setForm((current) => ({
            ...current,
            province_id: ward?.province_id || ward?.ProvinceID || current.province_id || "",
            province_name: ward?.province_name || ward?.ProvinceName || current.province_name || "",
            ward_code: ward?.ward_code || ward?.WardCode || "",
            ward_name: ward?.ward_name || ward?.WardName || "",
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const payload = {
                ward_code: `${form.ward_code}`,
                ward_name: form.ward_name,
                province_id: Number(form.province_id),
                province_name: form.province_name,
                specific_address: form.specific_address,
                full_name: form.full_name,
                phone: form.phone,
                is_default: Boolean(form.is_default),
            };

            if (editingAddressId) {
                await AddressService.updateAddress(editingAddressId, payload);
            } else {
                await AddressService.createAddress(payload);
            }

            setFormOpen(false);
            await loadAddresses();
        } catch (e) {
            setError(e?.response?.data?.message || "Không thể lưu địa chỉ. Vui lòng kiểm tra lại thông tin.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (addressId) => {
        if (!window.confirm("Bạn muốn xóa địa chỉ này?")) return;

        setSaving(true);
        setError("");

        try {
            await AddressService.deleteAddress(addressId);
            await loadAddresses();
        } catch (e) {
            setError(e?.response?.data?.message || "Không thể xóa địa chỉ.");
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (addressId) => {
        setSaving(true);
        setError("");

        try {
            await AddressService.setDefaultAddress(addressId);
            await loadAddresses();
        } catch (e) {
            setError(e?.response?.data?.message || "Không thể đặt địa chỉ mặc định.");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirm = () => {
        if (!selectedAddress) {
            setError("Vui lòng chọn địa chỉ giao hàng.");
            return;
        }

        onSelect(selectedAddress);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-sm py-md backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-surface-container-lowest shadow-2xl">
                <div className="flex items-start justify-between gap-sm border-b border-outline-variant px-md py-md">
                    <div>
                        <h2 className="font-headline-md text-headline-md text-on-surface">Địa chỉ giao hàng</h2>
                        <p className="text-body-sm text-secondary">Chọn địa chỉ để tính phí vận chuyển ở bước tiếp theo.</p>
                    </div>
                    <button
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-container hover:text-error"
                        type="button"
                        onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {!formOpen && (
                    <section className="p-md">
                        <div className="mb-sm flex items-center justify-between gap-sm">
                            <h3 className="font-headline-sm text-headline-sm text-on-surface">Danh sách địa chỉ</h3>
                            <button
                                className="flex items-center gap-xs bg-primary px-sm py-xs font-label-md text-on-primary"
                                type="button"
                                onClick={openCreateForm}>
                                <span className="material-symbols-outlined text-base">add</span>
                                Thêm
                            </button>
                        </div>

                        {error && (
                            <div className="mb-sm border border-error bg-error/10 p-sm text-body-sm text-error">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="py-lg text-center text-secondary">Đang tải địa chỉ...</div>
                        ) : addresses.length > 0 ? (
                            <div className="flex flex-col gap-sm">
                                {addresses.map((address) => (
                                    <label
                                        key={address.id}
                                        className={`cursor-pointer rounded-lg border p-sm shadow-sm transition-all ${
                                            String(selectedId) === String(address.id)
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                                                : "border-outline-variant bg-surface hover:border-primary/60"
                                        }`}>
                                        <div className="flex items-start gap-sm">
                                            <input
                                                checked={String(selectedId) === String(address.id)}
                                                className="mt-1"
                                                name="selected_address"
                                                type="radio"
                                                onChange={() => setSelectedId(address.id)}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-xs">
                                                    <span className="font-label-md text-label-md text-on-surface">
                                                        {address.full_name}
                                                    </span>
                                                    <span className="text-body-sm text-secondary">{address.phone}</span>
                                                    {address.is_default && (
                                                        <span className="rounded-full bg-secondary-container px-xs py-0.5 text-[11px] font-bold uppercase text-primary">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-xs text-body-sm text-secondary">
                                                    {formatAddress(address)}
                                                </p>
                                                <div className="mt-sm flex flex-wrap gap-xs">
                                                    <button
                                                        className="text-label-sm text-primary hover:underline"
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            openEditForm(address);
                                                        }}>
                                                        Sửa
                                                    </button>
                                                    {!address.is_default && (
                                                        <button
                                                            className="text-label-sm text-primary hover:underline"
                                                            disabled={saving}
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                handleSetDefault(address.id);
                                                            }}>
                                                            Đặt mặc định
                                                        </button>
                                                    )}
                                                    <button
                                                        className="text-label-sm text-error hover:underline"
                                                        disabled={saving}
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            handleDelete(address.id);
                                                        }}>
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-outline-variant p-lg text-center text-secondary">
                                Bạn chưa có địa chỉ giao hàng.
                            </div>
                        )}
                    </section>
                    )}

                    {formOpen && (
                    <section className="p-md">
                        <div className="mb-sm flex items-center justify-between gap-sm">
                            <h3 className="font-headline-sm text-headline-sm text-on-surface">
                                {formOpen ? (editingAddressId ? "Sửa địa chỉ" : "Thêm địa chỉ") : "Thông tin địa chỉ"}
                            </h3>
                            {!formOpen && (
                                <button className="text-label-sm text-primary hover:underline" type="button" onClick={openCreateForm}>
                                    Thêm địa chỉ mới
                                </button>
                            )}
                        </div>

                        <>
                            {error && (
                                <div className="mb-sm rounded-md border border-error bg-error/10 p-sm text-body-sm text-error">
                                    {error}
                                </div>
                            )}

                            <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                                    <label className="text-label-sm text-secondary">
                                        Họ tên
                                        <input
                                            required
                                            className="mt-xs w-full rounded-md border border-outline-variant bg-surface p-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                            value={form.full_name}
                                            onChange={(event) => updateForm("full_name", event.target.value)}
                                        />
                                    </label>
                                    <label className="text-label-sm text-secondary">
                                        Số điện thoại
                                        <input
                                            required
                                            className="mt-xs w-full rounded-md border border-outline-variant bg-surface p-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                            value={form.phone}
                                            onChange={(event) => updateForm("phone", event.target.value)}
                                        />
                                    </label>
                                </div>

                                <label className="text-label-sm text-secondary">
                                    Tỉnh/Thành phố
                                    <select
                                        required
                                        className="mt-xs w-full rounded-md border border-outline-variant bg-surface p-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                        value={form.province_id}
                                        onChange={(event) => handleProvinceChange(event.target.value)}>
                                        <option value="">Chọn tỉnh/thành phố</option>
                                        {provinces.map((province) => (
                                            <option key={province.province_id} value={province.province_id}>
                                                {province.province_name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-label-sm text-secondary">
                                    Phường/Xã
                                    <select
                                        required
                                        className="mt-xs w-full rounded-md border border-outline-variant bg-surface p-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                                        disabled={!form.province_id}
                                        value={form.ward_code}
                                        onChange={(event) => handleWardChange(event.target.value)}>
                                        <option value="">Chọn phường/xã</option>
                                        {wards.map((ward) => (
                                            <option key={ward.ward_code || ward.WardCode} value={ward.ward_code || ward.WardCode}>
                                                {ward.ward_name || ward.WardName}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-label-sm text-secondary">
                                    Địa chỉ cụ thể
                                    <textarea
                                        required
                                        className="mt-xs min-h-24 w-full resize-none rounded-md border border-outline-variant bg-surface p-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                        value={form.specific_address}
                                        onChange={(event) => updateForm("specific_address", event.target.value)}
                                    />
                                </label>

                                <label className="flex items-center gap-xs text-label-sm text-secondary">
                                    <input
                                        checked={form.is_default}
                                        type="checkbox"
                                        onChange={(event) => updateForm("is_default", event.target.checked)}
                                    />
                                    Đặt làm địa chỉ mặc định
                                </label>

                                <div className="flex justify-end gap-xs pt-xs">
                                    <button
                                        className="border border-outline-variant px-md py-sm text-label-md text-secondary hover:bg-surface-container"
                                        type="button"
                                        onClick={() => setFormOpen(false)}>
                                        Hủy
                                    </button>
                                    <button
                                        className="bg-primary px-md py-sm text-label-md text-on-primary disabled:opacity-60"
                                        disabled={saving}
                                        type="submit">
                                        {saving ? "Đang lưu..." : "Lưu địa chỉ"}
                                    </button>
                                </div>
                            </form>
                        </>
                        {formOpen && selectedAddress?.id === "__never__" && (
                            <div className="border border-outline-variant bg-surface p-md">
                                <p className="font-label-md text-label-md text-on-surface">{selectedAddress.full_name}</p>
                                <p className="mt-xs text-body-sm text-secondary">{selectedAddress.phone}</p>
                                <p className="mt-sm text-body-md text-on-surface">
                                    {formatAddress(selectedAddress)}
                                </p>
                            </div>
                        ) && (
                            <div className="border border-dashed border-outline-variant p-lg text-center text-secondary">
                                Chọn một địa chỉ bên trái hoặc thêm địa chỉ mới.
                            </div>
                        )}
                    </section>
                    )}
                </div>

                {!formOpen && (
                <div className="flex justify-end gap-xs border-t border-outline-variant px-md py-sm">
                    <button
                        className="border border-outline-variant px-md py-sm text-label-md text-secondary hover:bg-surface-container"
                        type="button"
                        onClick={onClose}>
                        Đóng
                    </button>
                    <button
                        className="bg-primary px-md py-sm text-label-md text-on-primary disabled:opacity-60"
                        disabled={!selectedAddress}
                        type="button"
                        onClick={handleConfirm}>
                        Dùng địa chỉ này
                    </button>
                </div>
                )}
            </div>
        </div>
    );
};

export default AddressSelectionModal;
