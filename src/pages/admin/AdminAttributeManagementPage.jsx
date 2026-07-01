import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, Switch, notification } from 'antd';
import ConfirmModal from '../../components/admin/ConfirmModal';
import PageHeader from '../../components/admin/PageHeader';
import AdminActionButton from '../../components/admin/AdminActionButton';
import AttributeService from '../../services/AttributeService';

const EMPTY_TYPE_FORM = { id: null, name: '', display_name: '' };
const EMPTY_VALUE_FORM = {
  id: null,
  value: '',
  display_value: '',
  metadata: '',
  colorMode: false,
  colorHex: '#000000',
};

const getValues = (attribute) => {
  const values = attribute?.attribute_values ?? attribute?.attributeValues ?? [];
  return Array.isArray(values) ? values : [];
};

const getErrorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors;
  return (
    (errors && Object.values(errors).flat().find(Boolean)) ||
    error?.response?.data?.message ||
    fallback
  );
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN').format(date);
};

const showUsageError = (error, entityName) => {
  const usages = error?.response?.data?.data?.usages;
  const message = getErrorMessage(
    error,
    `${entityName} đang được một sản phẩm sử dụng nên không thể xóa.`
  );

  Modal.error({
    title: `Không thể xóa ${entityName.toLocaleLowerCase('vi')}`,
    width: 620,
    content: (
      <div className="mt-3">
        <p className="text-sm text-on-surface-variant">{message}</p>
        {Array.isArray(usages) && usages.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-sm font-semibold text-on-surface">
              Đang được sử dụng bởi:
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {usages.map((usage, index) => (
                <div
                  key={`${usage.product_variant_id ?? index}-${usage.attribute_value_id ?? ''}`}
                  className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-sm"
                >
                  <p className="font-medium text-on-surface">
                    {usage.product_name || `Sản phẩm #${usage.product_id ?? '—'}`}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    SKU: {usage.sku || '—'} · Biến thể #{usage.product_variant_id ?? '—'}
                    {usage.attribute_value ? ` · Giá trị: ${usage.attribute_value}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ),
    okText: 'Đã hiểu',
  });
};

const AdminAttributeManagementPage = () => {
  const [attributes, setAttributes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [valueFormOpen, setValueFormOpen] = useState(false);
  const [valueForm, setValueForm] = useState(EMPTY_VALUE_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const applyAttributes = (response, preferredId = null) => {
    const items = Array.isArray(response) ? response : [];
    setAttributes(items);
    setSelectedId((current) => {
      const nextId = preferredId ?? current;
      if (items.some((item) => String(item.id) === String(nextId))) return nextId;
      return items[0]?.id ?? null;
    });
  };

  const loadAttributes = async (preferredId = null) => {
    setLoading(true);
    try {
      const response = await AttributeService.getAllAttributes();
      applyAttributes(response, preferredId);
    } catch (error) {
      setAttributes([]);
      setSelectedId(null);
      notification.error({
        message: 'Không thể tải thuộc tính',
        description: getErrorMessage(error, 'Vui lòng kiểm tra kết nối và thử lại.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    AttributeService.getAllAttributes()
      .then((response) => {
        if (!mounted) return;
        const items = Array.isArray(response) ? response : [];
        setAttributes(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((error) => {
        if (!mounted) return;
        notification.error({
          message: 'Không thể tải thuộc tính',
          description: getErrorMessage(error, 'Vui lòng kiểm tra kết nối và thử lại.'),
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedAttribute = useMemo(
    () => attributes.find((item) => String(item.id) === String(selectedId)) ?? null,
    [attributes, selectedId]
  );
  const selectedValues = getValues(selectedAttribute);

  const filteredAttributes = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return attributes.filter((attribute) =>
      `${attribute.name} ${attribute.display_name}`
        .toLocaleLowerCase('vi')
        .includes(keyword)
    );
  }, [attributes, search]);

  const totalValues = useMemo(
    () => attributes.reduce((total, attribute) => total + getValues(attribute).length, 0),
    [attributes]
  );

  const openCreateType = () => {
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeFormOpen(true);
  };

  const openEditType = () => {
    if (!selectedAttribute) return;
    setTypeForm({
      id: selectedAttribute.id,
      name: selectedAttribute.name ?? '',
      display_name: selectedAttribute.display_name ?? '',
    });
    setTypeFormOpen(true);
  };

  const submitType = async (event) => {
    event.preventDefault();
    const name = typeForm.name.trim();
    if (!name) {
      notification.warning({ message: 'Vui lòng nhập mã thuộc tính.' });
      return;
    }
    const payload = {
      name,
      display_name: typeForm.display_name.trim() || name,
    };

    setSaving(true);
    try {
      const result = typeForm.id
        ? await AttributeService.updateAttribute(typeForm.id, payload)
        : await AttributeService.createAttribute(payload);
      const preferredId = result?.id ?? typeForm.id;
      notification.success({
        message: typeForm.id ? 'Cập nhật thuộc tính thành công' : 'Tạo thuộc tính thành công',
      });
      setTypeFormOpen(false);
      setTypeForm(EMPTY_TYPE_FORM);
      await loadAttributes(preferredId);
    } catch (error) {
      notification.error({
        message: typeForm.id ? 'Không thể cập nhật thuộc tính' : 'Không thể tạo thuộc tính',
        description: getErrorMessage(error, 'Vui lòng kiểm tra dữ liệu và thử lại.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const openCreateValue = () => {
    setValueForm(EMPTY_VALUE_FORM);
    setValueFormOpen(true);
  };

  const openEditValue = (value) => {
    const colorHex = value.meta_data?.hex;
    setValueForm({
      id: value.id,
      value: value.value ?? '',
      display_value: value.display_value ?? '',
      metadata: value.meta_data ? JSON.stringify(value.meta_data, null, 2) : '',
      colorMode: Boolean(colorHex),
      colorHex: colorHex || '#000000',
    });
    setValueFormOpen(true);
  };

  const submitValue = async (event) => {
    event.preventDefault();
    const rawValue = valueForm.value.trim();
    if (!selectedAttribute || !rawValue) {
      notification.warning({ message: 'Vui lòng nhập giá trị thuộc tính.' });
      return;
    }
    if (valueForm.colorMode && !/^#[0-9A-Fa-f]{6}$/.test(valueForm.colorHex)) {
      notification.warning({
        message: 'Mã màu HEX chưa hợp lệ.',
        description: 'Vui lòng nhập đủ 6 ký tự, ví dụ #000000.',
      });
      return;
    }

    let metadata = null;
    if (valueForm.colorMode) {
      let existingMetadata = {};
      if (valueForm.metadata.trim()) {
        try {
          const parsed = JSON.parse(valueForm.metadata);
          if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
            existingMetadata = parsed;
          }
        } catch {
          existingMetadata = {};
        }
      }
      metadata = { ...existingMetadata, hex: valueForm.colorHex.toUpperCase() };
    } else if (valueForm.metadata.trim()) {
      try {
        metadata = JSON.parse(valueForm.metadata);
        if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
          throw new Error();
        }
      } catch {
        notification.warning({
          message: 'Metadata phải là một JSON object hợp lệ.',
          description: 'Ví dụ: {"hex":"#000000"}',
        });
        return;
      }
    }

    const payload = {
      value: rawValue,
      display_value: valueForm.display_value.trim() || rawValue,
      meta_data: metadata,
    };

    setSaving(true);
    try {
      if (valueForm.id) {
        await AttributeService.updateAttributeValue(
          selectedAttribute.id,
          valueForm.id,
          payload
        );
      } else {
        await AttributeService.createAttributeValue(selectedAttribute.id, payload);
      }
      notification.success({
        message: valueForm.id
          ? 'Cập nhật giá trị thành công'
          : 'Thêm giá trị thuộc tính thành công',
      });
      setValueFormOpen(false);
      setValueForm(EMPTY_VALUE_FORM);
      await loadAttributes(selectedAttribute.id);
    } catch (error) {
      notification.error({
        message: valueForm.id ? 'Không thể cập nhật giá trị' : 'Không thể thêm giá trị',
        description: getErrorMessage(error, 'Giá trị có thể đã tồn tại trong thuộc tính này.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'type') {
        await AttributeService.deleteAttribute(deleteTarget.item.id);
      } else {
        await AttributeService.deleteAttributeValue(
          selectedAttribute.id,
          deleteTarget.item.id
        );
      }
      notification.success({
        message:
          deleteTarget.kind === 'type'
            ? 'Xóa thuộc tính thành công'
            : 'Xóa giá trị thành công',
      });
      const preferredId =
        deleteTarget.kind === 'type' ? null : selectedAttribute?.id;
      setDeleteTarget(null);
      await loadAttributes(preferredId);
    } catch (error) {
      setDeleteTarget(null);
      if (error?.response?.status === 409) {
        showUsageError(
          error,
          deleteTarget.kind === 'type' ? 'Thuộc tính' : 'Giá trị thuộc tính'
        );
      } else {
        notification.error({
          message: 'Không thể xóa dữ liệu',
          description: getErrorMessage(error, 'Vui lòng thử lại sau.'),
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface pt-16">
      <div className="mx-auto max-w-[1280px] space-y-lg p-lg">
        <PageHeader
          eyebrow="Sản phẩm & biến thể"
          title="Thuộc tính sản phẩm"
          subtitle="Quản lý các thuộc tính như màu sắc, kích cỡ và giá trị dùng cho biến thể."
          actions={<button
            type="button"
            onClick={openCreateType}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm thuộc tính
          </button>}
        />

        <section className="grid gap-md sm:grid-cols-3">
          {[
            ['Loại thuộc tính', attributes.length, 'tune'],
            ['Tổng giá trị', totalValues, 'list_alt'],
            ['Đang chọn', selectedAttribute?.display_name || 'Chưa chọn', 'ads_click'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-xl border border-outline-variant bg-white p-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">{label}</p>
                <span className="material-symbols-outlined text-primary">{icon}</span>
              </div>
              <p className="mt-sm truncate text-xl font-semibold text-on-surface">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid min-h-[560px] overflow-hidden rounded-xl border border-outline-variant bg-white md:grid-cols-[260px_1fr] lg:grid-cols-[330px_1fr]">
          <aside className="border-b border-outline-variant md:border-b-0 md:border-r">
            <div className="border-b border-outline-variant p-md">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-outline">search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm thuộc tính"
                  className="w-full rounded-lg border border-outline-variant py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 md:max-h-[600px]">
              {loading ? (
                <div className="py-xl text-center"><Spin /></div>
              ) : filteredAttributes.length === 0 ? (
                <div className="px-md py-xl text-center text-sm text-on-surface-variant">
                  Không tìm thấy thuộc tính.
                </div>
              ) : filteredAttributes.map((attribute) => {
                const active = String(attribute.id) === String(selectedId);
                return (
                  <button
                    key={attribute.id}
                    type="button"
                    onClick={() => setSelectedId(attribute.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-md py-3 text-left transition ${
                      active
                        ? 'bg-secondary-container text-primary'
                        : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{attribute.display_name || attribute.name}</p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">{attribute.name}</p>
                    </div>
                    <span className="ml-3 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">
                      {getValues(attribute).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            {!selectedAttribute ? (
              <div className="flex h-full min-h-80 flex-col items-center justify-center p-lg text-center text-on-surface-variant">
                <span className="material-symbols-outlined mb-3 text-5xl text-outline">tune</span>
                <p className="font-medium text-on-surface">Chưa có thuộc tính nào</p>
                <p className="mt-1 text-sm">Tạo thuộc tính đầu tiên để thêm các giá trị.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-outline-variant p-md sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-on-surface">
                        {selectedAttribute.display_name || selectedAttribute.name}
                      </h2>
                      <code className="rounded bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                        {selectedAttribute.name}
                      </code>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {selectedValues.length} giá trị · Cập nhật {formatDate(selectedAttribute.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={openEditType} className="rounded-lg border border-outline-variant px-sm py-2 text-sm font-medium hover:bg-surface-container">
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: 'type', item: selectedAttribute })}
                      className="rounded-lg border border-error/40 px-sm py-2 text-sm font-medium text-error hover:bg-error-container/30"
                    >
                      Xóa thuộc tính
                    </button>
                    <button type="button" onClick={openCreateValue} className="inline-flex items-center gap-1 rounded-lg bg-primary px-sm py-2 text-sm font-medium text-on-primary hover:bg-primary-container">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Thêm giá trị
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-surface-container-low">
                      <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                        <th className="px-md py-sm">Hiển thị</th>
                        <th className="px-md py-sm">Giá trị hệ thống</th>
                        <th className="px-md py-sm">Metadata</th>
                        <th className="px-md py-sm">Cập nhật</th>
                        <th className="px-md py-sm text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {selectedValues.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-md py-xl text-center text-on-surface-variant">
                            Chưa có giá trị. Hãy thêm giá trị đầu tiên cho thuộc tính này.
                          </td>
                        </tr>
                      ) : selectedValues.map((item) => {
                        const hex = item.meta_data?.hex;
                        return (
                          <tr key={item.id} className="hover:bg-surface-container-low/50">
                            <td className="px-md py-sm">
                              <div className="flex items-center gap-2 font-medium">
                                {hex && (
                                  <span
                                    className="h-7 w-7 rounded-full border border-outline-variant shadow-sm"
                                    style={{ backgroundColor: hex }}
                                    title={hex}
                                  />
                                )}
                                {item.display_value || item.value}
                              </div>
                            </td>
                            <td className="px-md py-sm"><code className="rounded bg-surface-container px-2 py-1 text-xs">{item.value}</code></td>
                            <td className="px-md py-sm text-xs text-on-surface-variant">
                              {item.meta_data ? JSON.stringify(item.meta_data) : '—'}
                            </td>
                            <td className="px-md py-sm text-sm text-on-surface-variant">{formatDate(item.updated_at)}</td>
                            <td className="px-md py-sm">
                              <div className="flex justify-end gap-2">
                                <AdminActionButton
                                  icon="edit"
                                  label="Chỉnh sửa giá trị"
                                  onClick={() => openEditValue(item)}
                                />
                                <AdminActionButton
                                  icon="delete"
                                  label="Xóa giá trị"
                                  tone="danger"
                                  onClick={() => setDeleteTarget({ kind: 'value', item })}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={typeFormOpen}
        onCancel={() => !saving && setTypeFormOpen(false)}
        footer={null}
        title={typeForm.id ? 'Chỉnh sửa thuộc tính' : 'Thêm thuộc tính mới'}
      >
        <form onSubmit={submitType} className="space-y-md pt-sm">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Mã thuộc tính <span className="text-error">*</span></span>
            <input
              autoFocus
              maxLength={255}
              value={typeForm.name}
              onChange={(event) => setTypeForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Ví dụ: color, size"
              className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs text-on-surface-variant">Dùng trong hệ thống và bộ lọc sản phẩm; nên viết ngắn gọn, không dấu.</span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Tên hiển thị</span>
            <input
              maxLength={255}
              value={typeForm.display_name}
              onChange={(event) => setTypeForm((previous) => ({ ...previous, display_name: event.target.value }))}
              placeholder="Ví dụ: Màu sắc"
              className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs text-on-surface-variant">Để trống, backend sẽ sử dụng mã thuộc tính.</span>
          </label>
          <div className="flex justify-end gap-2 border-t border-outline-variant pt-md">
            <button type="button" onClick={() => setTypeFormOpen(false)} disabled={saving} className="rounded-lg border border-outline-variant px-lg py-2.5">Hủy</button>
            <button type="submit" disabled={saving || !typeForm.name.trim()} className="rounded-lg bg-primary px-lg py-2.5 font-medium text-on-primary disabled:opacity-50">
              {saving ? 'Đang lưu...' : typeForm.id ? 'Lưu thay đổi' : 'Tạo thuộc tính'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={valueFormOpen}
        onCancel={() => !saving && setValueFormOpen(false)}
        footer={null}
        width={620}
        title={valueForm.id ? 'Chỉnh sửa giá trị' : `Thêm giá trị cho ${selectedAttribute?.display_name ?? ''}`}
      >
        <form onSubmit={submitValue} className="space-y-md pt-sm">
          <div className="grid gap-md sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Giá trị hệ thống <span className="text-error">*</span></span>
              <input
                autoFocus
                maxLength={255}
                value={valueForm.value}
                onChange={(event) => setValueForm((previous) => ({ ...previous, value: event.target.value }))}
                placeholder="Ví dụ: black"
                className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Tên hiển thị</span>
              <input
                maxLength={255}
                value={valueForm.display_value}
                onChange={(event) => setValueForm((previous) => ({ ...previous, display_value: event.target.value }))}
                placeholder="Ví dụ: Đen"
                className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary"
              />
            </label>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-md">
            <div>
              <p className="text-sm font-medium text-on-surface">Dữ liệu màu sắc</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Bật để chọn màu trực quan thay vì phải viết JSON.
              </p>
            </div>
            <Switch
              checked={valueForm.colorMode}
              onChange={(checked) =>
                setValueForm((previous) => ({ ...previous, colorMode: checked }))
              }
            />
          </div>

          {valueForm.colorMode ? (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-md">
              <p className="text-sm font-medium text-on-surface">Chọn màu hiển thị</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label
                  className="relative h-20 w-full cursor-pointer overflow-hidden rounded-xl border border-outline-variant shadow-sm sm:w-28"
                  style={{
                    backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(valueForm.colorHex)
                      ? valueForm.colorHex
                      : '#000000',
                  }}
                  title="Mở bảng chọn màu"
                >
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(valueForm.colorHex)
                        ? valueForm.colorHex
                        : '#000000'
                    }
                    onChange={(event) =>
                      setValueForm((previous) => ({
                        ...previous,
                        colorHex: event.target.value,
                      }))
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="material-symbols-outlined absolute bottom-1.5 right-1.5 rounded-full bg-white/90 p-1 text-[17px] text-on-surface shadow">
                    colorize
                  </span>
                </label>
                <label className="flex-1 space-y-2">
                  <span className="text-xs font-medium text-on-surface-variant">
                    Mã màu HEX
                  </span>
                  <input
                    value={valueForm.colorHex}
                    maxLength={7}
                    onChange={(event) => {
                      const characters = event.target.value
                        .replace(/#/g, '')
                        .replace(/[^0-9A-Fa-f]/g, '')
                        .slice(0, 6);
                      setValueForm((previous) => ({
                        ...previous,
                        colorHex: `#${characters.toUpperCase()}`,
                      }));
                    }}
                    className="w-full rounded-lg border border-outline-variant bg-white px-md py-2.5 font-mono uppercase outline-none focus:border-primary"
                  />
                  <span className="block text-xs text-on-surface-variant">
                    Sẽ lưu thành JSON: {`{"hex":"${valueForm.colorHex.toUpperCase()}"}`}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Metadata JSON{' '}
                <span className="font-normal text-on-surface-variant">
                  (không bắt buộc)
                </span>
              </span>
              <textarea
                rows="5"
                value={valueForm.metadata}
                onChange={(event) =>
                  setValueForm((previous) => ({
                    ...previous,
                    metadata: event.target.value,
                  }))
                }
                placeholder={'{\n  "key": "value"\n}'}
                className="w-full resize-y rounded-lg border border-outline-variant px-md py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <span className="text-xs text-on-surface-variant">
                Dùng cho dữ liệu mở rộng không phải màu sắc.
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-outline-variant pt-md">
            <button type="button" onClick={() => setValueFormOpen(false)} disabled={saving} className="rounded-lg border border-outline-variant px-lg py-2.5">Hủy</button>
            <button type="submit" disabled={saving || !valueForm.value.trim()} className="rounded-lg bg-primary px-lg py-2.5 font-medium text-on-primary disabled:opacity-50">
              {saving ? 'Đang lưu...' : valueForm.id ? 'Lưu thay đổi' : 'Thêm giá trị'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'type' ? 'Xóa thuộc tính' : 'Xóa giá trị thuộc tính'}
        message={
          deleteTarget?.kind === 'type'
            ? `Bạn có chắc muốn xóa thuộc tính “${deleteTarget?.item?.display_name || deleteTarget?.item?.name || ''}” và toàn bộ giá trị bên trong?`
            : `Bạn có chắc muốn xóa giá trị “${deleteTarget?.item?.display_value || deleteTarget?.item?.value || ''}”?`
        }
        confirmText={deleting ? 'Đang xóa...' : 'Xóa'}
        cancelText="Hủy"
        isDangerous
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </main>
  );
};

export default AdminAttributeManagementPage;
