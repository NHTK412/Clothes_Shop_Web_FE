import { useEffect, useMemo, useState } from 'react';
import { Modal, Select, Spin, Switch, notification } from 'antd';
import ConfirmModal from '../../components/admin/ConfirmModal';
import PageHeader from '../../components/admin/PageHeader';
import ProductsService from '../../services/ProductsService';
import PromotionService from '../../services/PromotionService';

const EMPTY_FORM = {
  name: '',
  description: '',
  discount_amount: '',
  discount_type: 'percentage',
  start_date: '',
  end_date: '',
  is_active: true,
  product_ids: [],
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getPromotionStatus = (promotion) => {
  if (!promotion?.is_active) {
    return { key: 'disabled', label: 'Đã tắt', classes: 'bg-gray-100 text-gray-700' };
  }

  const now = Date.now();
  const start = new Date(promotion.start_date).getTime();
  const end = new Date(promotion.end_date).getTime();

  if (Number.isFinite(start) && start > now) {
    return { key: 'upcoming', label: 'Sắp diễn ra', classes: 'bg-blue-100 text-blue-700' };
  }
  if (Number.isFinite(end) && end < now) {
    return { key: 'expired', label: 'Đã hết hạn', classes: 'bg-amber-100 text-amber-700' };
  }
  return { key: 'active', label: 'Đang diễn ra', classes: 'bg-emerald-100 text-emerald-700' };
};

const AdminPromotionListPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: '', status: '', is_active: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadPromotions = async () => {
      setLoading(true);
      try {
        const response = await PromotionService.getPromotions({
          page,
          per_page: 10,
          q: filters.q || undefined,
          status: filters.status || undefined,
          is_active: filters.is_active === '' ? undefined : filters.is_active,
        });
        if (!mounted) return;
        setPromotions(response.items);
        setPagination(response.pagination);
      } catch (error) {
        if (!mounted) return;
        setPromotions([]);
        setPagination(null);
        notification.error({
          message: 'Không thể tải khuyến mãi',
          description: error?.response?.data?.message || 'Vui lòng thử lại sau.',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPromotions();
    return () => {
      mounted = false;
    };
  }, [page, filters, refreshKey]);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await ProductsService.getAllProducts({ page: 1, per_page: 100 });
        const items = response?.data?.items ?? response?.data?.data?.items ?? [];
        if (mounted) setProducts(Array.isArray(items) ? items : []);
      } catch {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setProductsLoading(false);
      }
    };

    loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(
    () =>
      promotions.reduce(
        (result, promotion) => {
          result.total += 1;
          result[getPromotionStatus(promotion).key] += 1;
          return result;
        },
        { total: 0, active: 0, upcoming: 0, expired: 0, disabled: 0 }
      ),
    [promotions]
  );

  const openCreateForm = () => {
    setEditingPromotion(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name ?? '',
      description: promotion.description ?? '',
      discount_amount: promotion.discount_amount ?? '',
      discount_type: promotion.discount_type ?? 'percentage',
      start_date: toDateTimeLocal(promotion.start_date),
      end_date: toDateTimeLocal(promotion.end_date),
      is_active: Boolean(promotion.is_active),
      product_ids: Array.isArray(promotion.products)
        ? promotion.products.map((product) => Number(product.id)).filter(Number.isFinite)
        : [],
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingPromotion(null);
    setFormData(EMPTY_FORM);
  };

  const updateFormField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(formData.discount_amount);
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (!formData.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      notification.warning({ message: 'Vui lòng nhập tên và mức giảm hợp lệ.' });
      return;
    }
    if (formData.discount_type === 'percentage' && amount > 100) {
      notification.warning({ message: 'Mức giảm phần trăm không được vượt quá 100%.' });
      return;
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      notification.warning({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
      return;
    }
    if (formData.product_ids.length === 0) {
      notification.warning({ message: 'Vui lòng chọn ít nhất một sản phẩm.' });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      discount_amount: amount,
      discount_type: formData.discount_type,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      is_active: formData.is_active,
      product_ids: [...new Set(formData.product_ids.map(Number))],
    };

    setSaving(true);
    try {
      if (editingPromotion) {
        await PromotionService.updatePromotion(editingPromotion.id, payload);
      } else {
        await PromotionService.createPromotion(payload);
      }
      notification.success({
        message: editingPromotion ? 'Cập nhật khuyến mãi thành công' : 'Tạo khuyến mãi thành công',
      });
      setFormOpen(false);
      setEditingPromotion(null);
      setFormData(EMPTY_FORM);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      notification.error({
        message: editingPromotion ? 'Không thể cập nhật khuyến mãi' : 'Không thể tạo khuyến mãi',
        description: error?.response?.data?.message || 'Sản phẩm có thể đang thuộc một khuyến mãi trùng thời gian.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget?.id) return;
    try {
      await PromotionService.deactivatePromotion(deactivateTarget.id);
      notification.success({ message: 'Đã tắt khuyến mãi' });
      setDeactivateTarget(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      notification.error({
        message: 'Không thể tắt khuyến mãi',
        description: error?.response?.data?.message || 'Vui lòng thử lại sau.',
      });
    }
  };

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters((previous) => ({ ...previous, q: searchDraft.trim() }));
  };

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? promotions.length;

  return (
    <main className="min-h-screen bg-surface pt-16">
      <div className="mx-auto max-w-[1280px] space-y-lg p-lg">
        <PageHeader
          title="Quản lý khuyến mãi"
          subtitle="Tạo chương trình giảm giá và áp dụng cho các sản phẩm theo thời gian."
          actions={<button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary transition hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm khuyến mãi
          </button>}
        />

        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tổng khuyến mãi', value: totalItems, icon: 'sell' },
            { label: 'Đang diễn ra (trang này)', value: summary.active, icon: 'campaign' },
            { label: 'Sắp diễn ra (trang này)', value: summary.upcoming, icon: 'schedule' },
            { label: 'Đã tắt / hết hạn (trang này)', value: summary.disabled + summary.expired, icon: 'event_busy' },
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
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status}
                onChange={(event) => {
                  setPage(1);
                  setFilters((previous) => ({ ...previous, status: event.target.value }));
                }}
                className="rounded-lg border border-outline-variant bg-white px-sm py-2 text-sm outline-none"
              >
                <option value="">Tất cả thời gian</option>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="active">Đang diễn ra</option>
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
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-surface-container-low">
                <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-md py-sm">Chương trình</th>
                  <th className="px-md py-sm">Mức giảm</th>
                  <th className="px-md py-sm">Thời gian</th>
                  <th className="px-md py-sm">Sản phẩm</th>
                  <th className="px-md py-sm">Trạng thái</th>
                  <th className="px-md py-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan="6" className="px-md py-xl text-center"><Spin /></td></tr>
                ) : promotions.length === 0 ? (
                  <tr><td colSpan="6" className="px-md py-xl text-center text-on-surface-variant">Không có khuyến mãi phù hợp.</td></tr>
                ) : promotions.map((promotion) => {
                  const status = getPromotionStatus(promotion);
                  return (
                    <tr key={promotion.id} className="hover:bg-surface-container-low/50">
                      <td className="px-md py-md">
                        <p className="font-semibold text-on-surface">{promotion.name}</p>
                        <p className="mt-1 max-w-xs truncate text-sm text-on-surface-variant">{promotion.description || 'Không có mô tả'}</p>
                      </td>
                      <td className="px-md py-md font-semibold text-error">
                        {promotion.discount_type === 'percentage'
                          ? `${Number(promotion.discount_amount)}%`
                          : formatMoney(promotion.discount_amount)}
                      </td>
                      <td className="px-md py-md text-sm">
                        <p>{formatDateTime(promotion.start_date)}</p>
                        <p className="mt-1 text-on-surface-variant">đến {formatDateTime(promotion.end_date)}</p>
                      </td>
                      <td className="px-md py-md">
                        <div className="flex items-center">
                          {(promotion.products || []).slice(0, 3).map((product, index) => (
                            <img
                              key={product.id}
                              src={product.image}
                              alt={product.name}
                              title={product.name}
                              className={`h-9 w-9 rounded-full border-2 border-white object-cover ${index > 0 ? '-ml-2' : ''}`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-on-surface-variant">{promotion.products?.length ?? 0} sản phẩm</span>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.classes}`}>{status.label}</span>
                      </td>
                      <td className="px-md py-md">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(promotion)}
                            className="rounded-lg border border-outline-variant px-sm py-2 text-sm text-on-surface hover:bg-surface-container"
                          >
                            Chỉnh sửa
                          </button>
                          {promotion.is_active && (
                            <button
                              type="button"
                              onClick={() => setDeactivateTarget(promotion)}
                              className="rounded-lg border border-error/50 px-sm py-2 text-sm text-error hover:bg-error-container/20"
                            >
                              Tắt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant px-md py-sm">
            <p className="text-sm text-on-surface-variant">Trang {pagination?.page ?? page}/{totalPages} · {totalItems} khuyến mãi</p>
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
        width={760}
        title={editingPromotion ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi'}
      >
        <form onSubmit={handleSubmit} className="space-y-md pt-sm">
          <div className="grid gap-md md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Tên chương trình *</span>
              <input
                value={formData.name}
                onChange={(event) => updateFormField('name', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
                placeholder="Ví dụ: Khuyến mãi mùa hè"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Mô tả</span>
              <textarea
                value={formData.description}
                onChange={(event) => updateFormField('description', event.target.value)}
                rows="3"
                className="w-full resize-none rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Loại giảm giá *</span>
              <select
                value={formData.discount_type}
                onChange={(event) => updateFormField('discount_type', event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-md py-2 outline-none"
              >
                <option value="percentage">Theo phần trăm</option>
                <option value="fixed">Số tiền cố định</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">
                Mức giảm * {formData.discount_type === 'percentage' ? '(%)' : '(VNĐ)'}
              </span>
              <input
                type="number"
                min="0"
                value={formData.discount_amount}
                onChange={(event) => updateFormField('discount_amount', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Bắt đầu *</span>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(event) => updateFormField('start_date', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Kết thúc *</span>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(event) => updateFormField('end_date', event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2 outline-none focus:border-primary"
              />
            </label>
            <div className="space-y-2 md:col-span-2">
              <span className="block text-sm font-medium">Sản phẩm áp dụng *</span>
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                value={formData.product_ids}
                onChange={(value) => updateFormField('product_ids', value)}
                loading={productsLoading}
                placeholder="Chọn sản phẩm"
                className="w-full"
                options={products.map((product) => ({
                  value: Number(product.id),
                  label: product.name,
                }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-md md:col-span-2">
              <div>
                <p className="text-sm font-medium text-on-surface">Kích hoạt khuyến mãi</p>
                <p className="mt-1 text-xs text-on-surface-variant">Khuyến mãi chỉ có hiệu lực trong khoảng thời gian đã chọn.</p>
              </div>
              <Switch checked={formData.is_active} onChange={(value) => updateFormField('is_active', value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-outline-variant pt-md">
            <button type="button" onClick={closeForm} className="rounded-lg border border-outline-variant px-lg py-2">Hủy</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-lg py-2 font-medium text-on-primary disabled:opacity-50">
              {saving ? 'Đang lưu...' : editingPromotion ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deactivateTarget)}
        title="Tắt khuyến mãi"
        message={`Bạn có chắc muốn tắt khuyến mãi "${deactivateTarget?.name ?? ''}"? Dữ liệu sẽ vẫn được lưu trong hệ thống.`}
        confirmText="Tắt khuyến mãi"
        cancelText="Hủy"
        isDangerous
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </main>
  );
};

export default AdminPromotionListPage;
