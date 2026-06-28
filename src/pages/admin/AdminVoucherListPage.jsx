import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, Switch, notification } from 'antd';
import VoucherService from '../../services/VoucherService';

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_amount: '',
  max_discount_amount: '',
  discount_type: 'ORDER',
  usage_limit: '',
  expiry_date: '',
  is_active: true,
};

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
};

const getVoucherStatus = (voucher) => {
  if (!voucher.is_active) {
    return { key: 'disabled', label: 'Đã tắt', classes: 'bg-gray-100 text-gray-700' };
  }

  const expiry = new Date(`${String(voucher.expiry_date).slice(0, 10)}T23:59:59`).getTime();
  if (Number.isFinite(expiry) && expiry < Date.now()) {
    return { key: 'expired', label: 'Đã hết hạn', classes: 'bg-amber-100 text-amber-700' };
  }

  return { key: 'valid', label: 'Còn hiệu lực', classes: 'bg-emerald-100 text-emerald-700' };
};

const AdminVoucherListPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    is_active: '',
    discount_type: '',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadVouchers = async () => {
      setLoading(true);
      try {
        const response = await VoucherService.getVouchers({
          page,
          per_page: 10,
          q: filters.q || undefined,
          status: filters.status || undefined,
          discount_type: filters.discount_type || undefined,
          is_active: filters.is_active === '' ? undefined : filters.is_active,
        });

        if (!mounted) return;
        setVouchers(response.items);
        setPagination(response.pagination);
      } catch (error) {
        if (!mounted) return;
        setVouchers([]);
        setPagination(null);
        notification.error({
          message: 'Không thể tải danh sách voucher',
          description: error?.response?.data?.message || 'Vui lòng thử lại sau.',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadVouchers();
    return () => {
      mounted = false;
    };
  }, [page, filters, refreshKey]);

  const summary = useMemo(
    () =>
      vouchers.reduce(
        (result, voucher) => {
          result[getVoucherStatus(voucher).key] += 1;
          result[voucher.discount_type === 'SHIPPING' ? 'shipping' : 'order'] += 1;
          return result;
        },
        { valid: 0, expired: 0, disabled: 0, shipping: 0, order: 0 }
      ),
    [vouchers]
  );

  const openCreateForm = () => {
    setEditingVoucher(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code ?? '',
      description: voucher.description ?? '',
      discount_amount: voucher.discount_amount ?? '',
      max_discount_amount: voucher.max_discount_amount ?? '',
      discount_type: voucher.discount_type ?? 'ORDER',
      usage_limit: voucher.usage_limit ?? '',
      expiry_date: String(voucher.expiry_date ?? '').slice(0, 10),
      is_active: Boolean(voucher.is_active),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingVoucher(null);
    setFormData(EMPTY_FORM);
  };

  const updateFormField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const discountAmount = Number(formData.discount_amount);
    const maxDiscountAmount =
      formData.max_discount_amount === '' ? null : Number(formData.max_discount_amount);
    const usageLimit = Number(formData.usage_limit);
    const minimumUsage = editingVoucher ? 0 : 1;

    if (!Number.isFinite(discountAmount) || discountAmount <= 0 || discountAmount > 100) {
      notification.warning({ message: 'Mức giảm phải lớn hơn 0 và không vượt quá 100%.' });
      return;
    }
    if (
      maxDiscountAmount !== null &&
      (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)
    ) {
      notification.warning({ message: 'Mức giảm tối đa không hợp lệ.' });
      return;
    }
    if (!Number.isInteger(usageLimit) || usageLimit < minimumUsage) {
      notification.warning({
        message: `Giới hạn sử dụng phải là số nguyên từ ${minimumUsage} trở lên.`,
      });
      return;
    }
    if (!formData.expiry_date || formData.expiry_date < today()) {
      notification.warning({ message: 'Ngày hết hạn không được nhỏ hơn ngày hiện tại.' });
      return;
    }

    const payload = {
      code: formData.code.trim() || null,
      description: formData.description.trim() || null,
      discount_amount: discountAmount,
      max_discount_amount: maxDiscountAmount,
      discount_type: formData.discount_type,
      usage_limit: usageLimit,
      expiry_date: formData.expiry_date,
      is_active: formData.is_active,
    };

    setSaving(true);
    try {
      if (editingVoucher) {
        await VoucherService.updateVoucher(editingVoucher.id, payload);
      } else {
        await VoucherService.createVoucher(payload);
      }

      notification.success({
        message: editingVoucher ? 'Cập nhật voucher thành công' : 'Tạo voucher thành công',
      });
      setFormOpen(false);
      setEditingVoucher(null);
      setFormData(EMPTY_FORM);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const validationErrors = error?.response?.data?.errors;
      const firstError = validationErrors
        ? Object.values(validationErrors).flat().find(Boolean)
        : null;
      notification.error({
        message: editingVoucher ? 'Không thể cập nhật voucher' : 'Không thể tạo voucher',
        description: firstError || error?.response?.data?.message || 'Vui lòng kiểm tra lại dữ liệu.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (voucher, isActive) => {
    setUpdatingStatusId(voucher.id);
    try {
      await VoucherService.updateVoucher(voucher.id, { is_active: isActive });
      notification.success({ message: isActive ? 'Đã bật voucher' : 'Đã tắt voucher' });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      notification.error({
        message: 'Không thể đổi trạng thái voucher',
        description: error?.response?.data?.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters((previous) => ({ ...previous, q: searchDraft.trim() }));
  };

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? vouchers.length;

  return (
    <main className="min-h-screen bg-surface pt-16">
      <div className="mx-auto max-w-[1280px] space-y-lg p-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-background">
              Quản lý voucher
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Quản lý mã giảm giá cho đơn hàng và phí vận chuyển.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary transition hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm voucher
          </button>
        </div>

        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tổng voucher', value: totalItems, icon: 'confirmation_number' },
            { label: 'Còn hiệu lực (trang này)', value: summary.valid, icon: 'verified' },
            { label: 'Voucher đơn hàng (trang này)', value: summary.order, icon: 'shopping_bag' },
            {
              label: 'Đã tắt / hết hạn (trang này)',
              value: summary.disabled + summary.expired,
              icon: 'event_busy',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-outline-variant bg-white p-md">
              <div className="mb-sm flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">{item.label}</p>
                <span className="material-symbols-outlined text-primary">{item.icon}</span>
              </div>
              <p className="text-2xl font-semibold text-on-surface">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-white">
          <div className="flex flex-col gap-3 border-b border-outline-variant p-md xl:flex-row xl:items-center xl:justify-between">
            <form onSubmit={applySearch} className="flex w-full max-w-md items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                  search
                </span>
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Tìm theo mã hoặc mô tả"
                  className="w-full rounded-lg border border-outline-variant py-2 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-primary px-md py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Tìm
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <select
                value={filters.discount_type}
                onChange={(event) => {
                  setPage(1);
                  setFilters((previous) => ({
                    ...previous,
                    discount_type: event.target.value,
                  }));
                }}
                className="rounded-lg border border-outline-variant bg-white px-sm py-2 text-sm outline-none"
              >
                <option value="">Tất cả loại</option>
                <option value="ORDER">Giảm đơn hàng</option>
                <option value="SHIPPING">Giảm phí vận chuyển</option>
              </select>
              <select
                value={filters.status}
                onChange={(event) => {
                  setPage(1);
                  setFilters((previous) => ({ ...previous, status: event.target.value }));
                }}
                className="rounded-lg border border-outline-variant bg-white px-sm py-2 text-sm outline-none"
              >
                <option value="">Tất cả thời hạn</option>
                <option value="valid">Còn hiệu lực</option>
                <option value="expired">Đã hết hạn</option>
              </select>
              <select
                value={filters.is_active}
                onChange={(event) => {
                  setPage(1);
                  setFilters((previous) => ({ ...previous, is_active: event.target.value }));
                }}
                className="rounded-lg border border-outline-variant bg-white px-sm py-2 text-sm outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang bật</option>
                <option value="false">Đã tắt</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left">
              <thead className="bg-surface-container-low">
                <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-md py-sm">Mã voucher</th>
                  <th className="px-md py-sm">Ưu đãi</th>
                  <th className="px-md py-sm">Loại áp dụng</th>
                  <th className="px-md py-sm">Lượt dùng</th>
                  <th className="px-md py-sm">Hết hạn</th>
                  <th className="px-md py-sm">Trạng thái</th>
                  <th className="px-md py-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-md py-xl text-center"><Spin /></td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-md py-xl text-center text-on-surface-variant">
                      Không có voucher phù hợp.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((voucher) => {
                    const status = getVoucherStatus(voucher);
                    return (
                      <tr key={voucher.id} className="hover:bg-surface-container-low/50">
                        <td className="px-md py-md">
                          <div className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-primary">
                            {voucher.code}
                          </div>
                          <p className="mt-2 max-w-xs truncate text-sm text-on-surface-variant">
                            {voucher.description || 'Không có mô tả'}
                          </p>
                        </td>
                        <td className="px-md py-md">
                          <p className="font-semibold text-error">
                            Giảm {Number(voucher.discount_amount)}%
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Tối đa{' '}
                            {voucher.max_discount_amount === null
                              ? 'không giới hạn'
                              : formatMoney(voucher.max_discount_amount)}
                          </p>
                        </td>
                        <td className="px-md py-md text-sm">
                          {voucher.discount_type === 'SHIPPING'
                            ? 'Phí vận chuyển'
                            : 'Đơn hàng'}
                        </td>
                        <td className="px-md py-md font-medium">
                          {Number(voucher.usage_limit).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-md py-md text-sm">{formatDate(voucher.expiry_date)}</td>
                        <td className="px-md py-md">
                          <div className="flex items-center gap-3">
                            <Switch
                              size="small"
                              checked={Boolean(voucher.is_active)}
                              loading={updatingStatusId === voucher.id}
                              disabled={status.key === 'expired'}
                              onChange={(checked) => handleStatusChange(voucher, checked)}
                            />
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-md py-md">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(voucher)}
                              className="rounded-lg border border-outline-variant px-sm py-2 text-sm text-on-surface hover:bg-surface-container"
                            >
                              Chỉnh sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant px-md py-sm">
            <p className="text-sm text-on-surface-variant">
              Trang {pagination?.page ?? page}/{totalPages} · {totalItems} voucher
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border border-outline-variant px-sm py-2 text-sm disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-outline-variant px-sm py-2 text-sm disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={formOpen}
        onCancel={closeForm}
        footer={null}
        width={720}
        title={editingVoucher ? 'Chỉnh sửa voucher' : 'Thêm voucher'}
      >
        <form onSubmit={handleSubmit} className="space-y-md pt-sm">
          <div className="grid gap-md md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Mã voucher</span>
              <input
                value={formData.code}
                maxLength={50}
                onChange={(event) =>
                  updateFormField(
                    'code',
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  )
                }
                className="w-full rounded-lg border border-outline-variant px-md py-2 font-mono uppercase outline-none focus:border-primary"
                placeholder="Bỏ trống để tự sinh mã"
              />
              <span className="block text-xs text-on-surface-variant">
                Chỉ gồm chữ cái và số; hệ thống tự sinh nếu để trống.
              </span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Loại áp dụng *</span>
              <select
                value={formData.discount_type}
                onChange={(event) => updateFormField('discount_type', event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-md py-2 outline-none focus:border-primary"
              >
                <option value="ORDER">Giảm giá đơn hàng</option>
                <option value="SHIPPING">Giảm phí vận chuyển</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Mô tả</span>
              <textarea
                value={formData.description}
                maxLength={255}
                rows="3"
                onChange={(event) => updateFormField('description', event.target.value)}
                className="w-full resize-none rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
                placeholder="Mô tả ngắn về điều kiện hoặc nội dung voucher"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Phần trăm giảm *</span>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(event) => updateFormField('discount_amount', event.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-md py-2 pr-10 outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">%</span>
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Mức giảm tối đa</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.max_discount_amount}
                  onChange={(event) => updateFormField('max_discount_amount', event.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-md py-2 pr-14 outline-none focus:border-primary"
                  placeholder="Không giới hạn"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">VNĐ</span>
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Giới hạn sử dụng *</span>
              <input
                type="number"
                min={editingVoucher ? 0 : 1}
                step="1"
                value={formData.usage_limit}
                onChange={(event) => updateFormField('usage_limit', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
                placeholder="Ví dụ: 100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Ngày hết hạn *</span>
              <input
                type="date"
                min={today()}
                value={formData.expiry_date}
                onChange={(event) => updateFormField('expiry_date', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-md md:col-span-2">
              <div>
                <p className="text-sm font-medium text-on-surface">Kích hoạt voucher</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Voucher chỉ có thể được sử dụng khi đang bật và chưa hết hạn.
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onChange={(checked) => updateFormField('is_active', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant pt-md">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-outline-variant px-lg py-2"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-lg py-2 font-medium text-on-primary disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : editingVoucher ? 'Lưu thay đổi' : 'Tạo voucher'}
            </button>
          </div>
        </form>
      </Modal>

    </main>
  );
};

export default AdminVoucherListPage;
