import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, Upload, notification } from 'antd';
import ConfirmModal from '../../components/admin/ConfirmModal';
import CategoryService from '../../services/CategoryService';
import UploadService from '../../services/UploadService';

const EMPTY_FORM = {
  id: null,
  name: '',
  parent_id: '',
  currentImage: '',
  imageFile: null,
  imagePreview: '',
};

const collectCategories = (items = []) => {
  const result = new Map();
  const visit = (category, inheritedParentId = null) => {
    if (category?.id === null || category?.id === undefined) return;
    const key = String(category.id);
    const existing = result.get(key) ?? {};
    result.set(key, {
      ...existing,
      ...category,
      parent_id: category.parent_id ?? category.parent?.id ?? inheritedParentId,
      children: Array.isArray(category.children) ? category.children : existing.children ?? [],
    });
    (category.children ?? []).forEach((child) => visit(child, category.id));
  };
  items.forEach((category) => visit(category));
  return [...result.values()];
};

const getUploadedImageUrl = (response) =>
  response?.data?.items?.url ??
  response?.data?.image_url ??
  response?.data?.url ??
  response?.items?.url ??
  response?.image_url ??
  response?.url ??
  null;

const getErrorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors;
  return (
    (errors && Object.values(errors).flat().find(Boolean)) ||
    error?.response?.data?.message ||
    fallback
  );
};

const AdminCategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await CategoryService.getCategories({ per_page: 0 });
      setCategories(collectCategories(response.items));
    } catch (error) {
      setCategories([]);
      notification.error({
        message: 'Không thể tải danh mục',
        description: getErrorMessage(error, 'Vui lòng kiểm tra kết nối và thử lại.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    CategoryService.getCategories({ per_page: 0 })
      .then((response) => {
        if (mounted) setCategories(collectCategories(response.items));
      })
      .catch((error) => {
        if (!mounted) return;
        setCategories([]);
        notification.error({
          message: 'Không thể tải danh mục',
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

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  );

  const descendants = useMemo(() => {
    const ids = new Set();
    if (!formData.id) return ids;
    const visit = (parentId) => {
      categories.forEach((category) => {
        const id = String(category.id);
        if (String(category.parent_id ?? '') === String(parentId) && !ids.has(id)) {
          ids.add(id);
          visit(category.id);
        }
      });
    };
    visit(formData.id);
    return ids;
  }, [categories, formData.id]);

  const parentOptions = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            String(category.id) !== String(formData.id) &&
            !descendants.has(String(category.id))
        )
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi')),
    [categories, descendants, formData.id]
  );

  const visibleCategories = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return [...categories]
      .filter((category) => {
        const parentName = categoryById.get(String(category.parent_id))?.name ?? '';
        return `${category.name} ${parentName}`.toLocaleLowerCase('vi').includes(keyword);
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  }, [categories, categoryById, search]);

  const rootCount = categories.filter((category) => !category.parent_id).length;

  const openCreateForm = () => {
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    setFormData({
      ...EMPTY_FORM,
      id: category.id,
      name: category.name ?? '',
      parent_id: category.parent_id ? String(category.parent_id) : '',
      currentImage: category.image ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setFormData(EMPTY_FORM);
  };

  const selectImage = (file) => {
    if (!file.type?.startsWith('image/')) {
      notification.warning({ message: 'Vui lòng chọn đúng tệp hình ảnh.' });
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      notification.warning({ message: 'Ảnh không được vượt quá 5 MB.' });
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setFormData((previous) => ({
        ...previous,
        imageFile: file,
        imagePreview: String(reader.result),
      }));
    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      notification.warning({ message: 'Vui lòng nhập tên danh mục.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      };

      if (formData.imageFile) {
        const uploadResult = await UploadService.uploadImage(formData.imageFile);
        const imageUrl = getUploadedImageUrl(uploadResult);
        if (!imageUrl) throw new Error('Không nhận được URL ảnh sau khi tải lên.');
        payload.image = imageUrl;
      }

      if (formData.id) {
        await CategoryService.updateCategory(formData.id, payload);
      } else {
        await CategoryService.createCategory(payload);
      }

      notification.success({
        message: formData.id ? 'Cập nhật danh mục thành công' : 'Tạo danh mục thành công',
      });
      setFormOpen(false);
      setFormData(EMPTY_FORM);
      await loadCategories();
    } catch (error) {
      notification.error({
        message: formData.id ? 'Không thể cập nhật danh mục' : 'Không thể tạo danh mục',
        description: getErrorMessage(error, error.message || 'Vui lòng thử lại sau.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await CategoryService.deleteCategory(deleteTarget.id);
      notification.success({ message: 'Xóa danh mục thành công' });
      setDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      notification.error({
        message: 'Không thể xóa danh mục',
        description: getErrorMessage(
          error,
          'Danh mục có thể đang chứa danh mục con hoặc sản phẩm.'
        ),
      });
    } finally {
      setDeleting(false);
    }
  };

  const previewImage = formData.imagePreview || formData.currentImage;
  const deleteTargetChildren = deleteTarget
    ? categories.filter(
        (category) => String(category.parent_id) === String(deleteTarget.id)
      ).length
    : 0;

  return (
    <main className="min-h-screen bg-surface pt-16">
      <div className="mx-auto max-w-[1280px] space-y-lg p-lg">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-sm font-medium text-primary">Sản phẩm &amp; nội dung</p>
            <h1 className="font-headline-md text-headline-md text-on-background">
              Quản lý danh mục
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Sắp xếp danh mục cha, danh mục con và hình ảnh hiển thị trên cửa hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary transition hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm danh mục
          </button>
        </header>

        <section className="grid gap-md sm:grid-cols-3">
          {[
            ['Tổng danh mục', categories.length, 'category'],
            ['Danh mục gốc', rootCount, 'account_tree'],
            ['Danh mục con', categories.length - rootCount, 'subdirectory_arrow_right'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-xl border border-outline-variant bg-white p-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">{label}</p>
                <span className="material-symbols-outlined text-primary">{icon}</span>
              </div>
              <p className="mt-sm text-2xl font-semibold text-on-surface">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-white">
          <div className="flex flex-col gap-3 border-b border-outline-variant p-md md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên danh mục hoặc danh mục cha"
                className="w-full rounded-lg border border-outline-variant py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Xóa tìm kiếm"
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
                >
                  close
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={loadCategories}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-sm py-2.5 text-sm font-medium hover:bg-surface-container disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-surface-container-low">
                <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-md py-sm">Danh mục</th>
                  <th className="px-md py-sm">Danh mục cha</th>
                  <th className="px-md py-sm">Danh mục con</th>
                  <th className="px-md py-sm">Cập nhật</th>
                  <th className="px-md py-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan="5" className="px-md py-xl text-center"><Spin /></td></tr>
                ) : visibleCategories.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-md py-xl text-center text-on-surface-variant">
                      <span className="material-symbols-outlined mb-2 block text-4xl text-outline">category</span>
                      {search ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục nào.'}
                    </td>
                  </tr>
                ) : visibleCategories.map((category) => {
                  const parent = categoryById.get(String(category.parent_id));
                  const childCount = categories.filter(
                    (item) => String(item.parent_id) === String(category.id)
                  ).length;
                  const updatedAt = new Date(category.updated_at);

                  return (
                    <tr key={category.id} className="hover:bg-surface-container-low/50">
                      <td className="px-md py-sm">
                        <div className="flex items-center gap-3">
                          {category.image ? (
                            <img src={category.image} alt="" className="h-12 w-12 rounded-lg border border-outline-variant object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-outline">
                              <span className="material-symbols-outlined">image</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-on-surface">{category.name}</p>
                            <p className="mt-0.5 text-xs text-on-surface-variant">ID: {category.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-sm">
                        {parent ? (
                          <span className="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium text-on-secondary-container">
                            {parent.name}
                          </span>
                        ) : (
                          <span className="text-sm text-on-surface-variant">Danh mục gốc</span>
                        )}
                      </td>
                      <td className="px-md py-sm text-sm">{childCount}</td>
                      <td className="px-md py-sm text-sm text-on-surface-variant">
                        {Number.isNaN(updatedAt.getTime())
                          ? '—'
                          : new Intl.DateTimeFormat('vi-VN').format(updatedAt)}
                      </td>
                      <td className="px-md py-sm">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditForm(category)} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-sm py-2 text-sm hover:bg-surface-container">
                            <span className="material-symbols-outlined text-[17px]">edit</span>Sửa
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(category)} className="inline-flex items-center gap-1 rounded-lg border border-error/40 px-sm py-2 text-sm text-error hover:bg-error-container/30">
                            <span className="material-symbols-outlined text-[17px]">delete</span>Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && (
            <div className="border-t border-outline-variant px-md py-sm text-sm text-on-surface-variant">
              Hiển thị {visibleCategories.length} / {categories.length} danh mục
            </div>
          )}
        </section>
      </div>

      <Modal
        open={formOpen}
        onCancel={closeForm}
        footer={null}
        width={720}
        destroyOnHidden
        title={formData.id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-md pt-sm">
          <div className="grid gap-md md:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-2 text-sm font-medium">
                Ảnh danh mục <span className="font-normal text-on-surface-variant">(không bắt buộc)</span>
              </p>
              <Upload.Dragger
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={selectImage}
                disabled={saving}
              >
                {previewImage ? (
                  <div className="p-2">
                    <img src={previewImage} alt="Xem trước" className="mx-auto h-36 w-full rounded-lg object-cover" />
                    <p className="mt-2 text-xs text-primary">Nhấn hoặc kéo ảnh vào để thay đổi</p>
                  </div>
                ) : (
                  <div className="px-3 py-lg">
                    <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
                    <p className="mt-2 text-sm font-medium">Chọn ảnh</p>
                    <p className="mt-1 text-xs text-on-surface-variant">PNG, JPG, WEBP · tối đa 5 MB</p>
                  </div>
                )}
              </Upload.Dragger>
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                {formData.id
                  ? 'Để trống để giữ nguyên ảnh hiện tại.'
                  : 'Để trống để backend dùng ảnh mặc định.'}
              </p>
              {formData.imageFile && (
                <button
                  type="button"
                  onClick={() => setFormData((previous) => ({ ...previous, imageFile: null, imagePreview: '' }))}
                  className="mt-2 text-xs font-medium text-error hover:underline"
                >
                  Bỏ ảnh vừa chọn
                </button>
              )}
            </div>

            <div className="space-y-md">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Tên danh mục <span className="text-error">*</span></span>
                <input
                  autoFocus
                  maxLength={255}
                  value={formData.name}
                  onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Ví dụ: Áo thun"
                  className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="block text-right text-xs text-on-surface-variant">{formData.name.length}/255</span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Danh mục cha</span>
                <select
                  value={formData.parent_id}
                  onChange={(event) => setFormData((previous) => ({ ...previous, parent_id: event.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-white px-md py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Không có — đây là danh mục gốc</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-on-surface-variant">
                  Danh mục hiện tại và các danh mục con được ẩn để tránh tạo vòng lặp.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-md sm:flex-row sm:justify-end">
            <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-outline-variant px-lg py-2.5 font-medium hover:bg-surface-container disabled:opacity-50">
              Hủy
            </button>
            <button type="submit" disabled={saving || !formData.name.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-2.5 font-medium text-on-primary hover:bg-primary-container disabled:opacity-50">
              {saving && <Spin size="small" />}
              {saving ? (formData.imageFile ? 'Đang tải ảnh và lưu...' : 'Đang lưu...') : formData.id ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa danh mục"
        message={
          deleteTargetChildren > 0
            ? `Danh mục "${deleteTarget?.name ?? ''}" đang có ${deleteTargetChildren} danh mục con. Bạn vẫn muốn gửi yêu cầu xóa?`
            : `Bạn có chắc muốn xóa danh mục "${deleteTarget?.name ?? ''}"? Hành động này không thể hoàn tác.`
        }
        confirmText={deleting ? 'Đang xóa...' : 'Xóa danh mục'}
        cancelText="Hủy"
        isDangerous
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </main>
  );
};

export default AdminCategoryManagementPage;
