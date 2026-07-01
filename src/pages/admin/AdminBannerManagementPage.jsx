import { useCallback, useEffect, useState } from "react";
import { Modal, Spin, Upload, notification } from "antd";
import PageHeader from "../../components/admin/PageHeader";
import AdminActionButton from "../../components/admin/AdminActionButton";
import ConfirmModal from "../../components/admin/ConfirmModal";
import BannerService from "../../services/BannerService";
import UploadService from "../../services/UploadService";

const EMPTY_FORM = {
  label: "",
  title: "",
  description: "",
  image_url: "",
};

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

const getErrorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors;
  const firstError = errors
    ? Object.values(errors).flat().find(Boolean)
    : null;
  return firstError || error?.response?.data?.message || fallback;
};

const AdminBannerManagementPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await BannerService.getBanners();
      setBanners(response.items);
    } catch (error) {
      setBanners([]);
      notification.error({
        message: "Không thể tải danh sách banner",
        description: getErrorMessage(error, "Vui lòng thử lại sau."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronize the admin list with the banner API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBanners();
  }, [loadBanners]);

  const openCreateForm = () => {
    setEditingBanner(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (banner) => {
    setEditingBanner(banner);
    setFormData({
      label: banner.label || "",
      title: banner.title || "",
      description: banner.description || "",
      image_url: banner.image_url || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving || uploading) return;
    setFormOpen(false);
    setEditingBanner(null);
    setFormData(EMPTY_FORM);
  };

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const uploadImage = async (file) => {
    if (!file.type?.startsWith("image/")) {
      notification.warning({ message: "Vui lòng chọn một tệp ảnh." });
      return;
    }

    setUploading(true);
    try {
      const response = await UploadService.uploadImage(file);
      const imageUrl = response?.image_url || response?.url;
      if (!imageUrl) throw new Error("Upload response does not contain image_url");
      updateField("image_url", imageUrl);
      notification.success({ message: "Đã tải ảnh banner." });
    } catch (error) {
      notification.error({
        message: "Không thể tải ảnh",
        description: getErrorMessage(error, "Vui lòng thử lại với ảnh khác."),
      });
    } finally {
      setUploading(false);
    }
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (saving || uploading) return;

    const payload = {
      label: formData.label.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      image_url: formData.image_url.trim(),
    };

    if (Object.values(payload).some((value) => !value)) {
      notification.warning({ message: "Vui lòng nhập đầy đủ thông tin banner." });
      return;
    }

    try {
      new URL(payload.image_url);
    } catch {
      notification.warning({ message: "URL ảnh banner không hợp lệ." });
      return;
    }

    setSaving(true);
    try {
      if (editingBanner) {
        await BannerService.updateBanner(editingBanner.id, payload);
      } else {
        await BannerService.createBanner(payload);
      }

      notification.success({
        message: editingBanner
          ? "Cập nhật banner thành công"
          : "Tạo banner thành công",
      });
      setFormOpen(false);
      setEditingBanner(null);
      setFormData(EMPTY_FORM);
      await loadBanners();
    } catch (error) {
      notification.error({
        message: editingBanner
          ? "Không thể cập nhật banner"
          : "Không thể tạo banner",
        description: getErrorMessage(error, "Vui lòng kiểm tra lại dữ liệu."),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await BannerService.deleteBanner(deleteTarget.id);
      notification.success({ message: "Đã xóa banner thành công" });
      setDeleteTarget(null);
      await loadBanners();
    } catch (error) {
      notification.error({
        message: "Không thể xóa banner",
        description: getErrorMessage(error, "Vui lòng thử lại sau."),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface pt-16">
      <div className="mx-auto w-full max-w-[1280px] space-y-lg p-lg">
        <PageHeader
          title="Quản lý banner"
          subtitle="Quản lý hình ảnh và nội dung nổi bật hiển thị trên trang chủ."
          actions={(
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-lg py-sm font-medium text-on-primary transition hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm banner
            </button>
          )}
        />

        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-white p-md">
            <p className="text-sm text-on-surface-variant">Tổng banner</p>
            <p className="mt-1 text-2xl font-bold text-on-surface">{banners.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-md">
            <p className="text-sm text-on-surface-variant">Banner đang hiển thị đầu tiên</p>
            <p className="mt-1 truncate text-lg font-bold text-primary">
              {banners[0]?.title || "Chưa có banner"}
            </p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-md sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-on-surface-variant">Cập nhật gần nhất</p>
            <p className="mt-1 text-lg font-bold text-on-surface">
              {formatDateTime(banners[0]?.updated_at)}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-surface-container-low">
                <tr className="text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-md py-sm">Banner</th>
                  <th className="px-md py-sm">Nhãn</th>
                  <th className="px-md py-sm">Mô tả</th>
                  <th className="px-md py-sm">Cập nhật</th>
                  <th className="px-md py-sm text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-md py-xl text-center">
                      <Spin />
                    </td>
                  </tr>
                ) : banners.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-md py-xl text-center text-on-surface-variant">
                      <span className="material-symbols-outlined mb-2 block text-5xl text-outline">
                        panorama
                      </span>
                      Chưa có banner. Hãy tạo banner đầu tiên cho trang chủ.
                    </td>
                  </tr>
                ) : banners.map((banner, index) => (
                  <tr key={banner.id} className="hover:bg-surface-container-low/50">
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-16 w-28 shrink-0 rounded-lg border border-outline-variant object-cover"
                        />
                        <div className="min-w-0">
                          <p className="max-w-xs truncate font-semibold text-on-surface">
                            {banner.title}
                          </p>
                          {index === 0 ? (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Hiển thị đầu tiên
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-sm text-sm font-medium">{banner.label}</td>
                    <td className="max-w-sm px-md py-sm">
                      <p className="line-clamp-2 text-sm text-on-surface-variant">
                        {banner.description}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-md py-sm text-sm text-on-surface-variant">
                      {formatDateTime(banner.updated_at)}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex justify-end gap-2">
                        <AdminActionButton
                          icon="edit"
                          label="Chỉnh sửa banner"
                          onClick={() => openEditForm(banner)}
                        />
                        <AdminActionButton
                          icon="delete"
                          label="Xóa banner"
                          tone="danger"
                          onClick={() => setDeleteTarget(banner)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal
        open={formOpen}
        onCancel={closeForm}
        footer={null}
        width={820}
        destroyOnHidden
        title={editingBanner ? "Chỉnh sửa banner" : "Thêm banner mới"}
      >
        <form onSubmit={submitForm} className="space-y-md pt-sm">
          <Upload.Dragger
            accept="image/*"
            showUploadList={false}
            disabled={uploading}
            beforeUpload={(file) => {
              uploadImage(file);
              return Upload.LIST_IGNORE;
            }}
          >
            {formData.image_url && !uploading ? (
              <div className="p-3">
                <img
                  src={formData.image_url}
                  alt="Ảnh banner đã tải lên"
                  className="mx-auto max-h-72 w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="px-4 py-xl">
                <span
                  className={`material-symbols-outlined text-5xl text-primary ${
                    uploading ? "animate-pulse" : ""
                  }`}
                >
                  {uploading ? "cloud_upload" : "add_photo_alternate"}
                </span>
                <p className="mt-2 font-medium">
                  {uploading ? "Đang tải ảnh..." : "Chọn hoặc kéo ảnh banner vào đây"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Khuyến nghị ảnh ngang tỷ lệ 16:9
                </p>
              </div>
            )}
          </Upload.Dragger>

          <div className="grid gap-md md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">
                Nhãn nhỏ <span className="text-error">*</span>
              </span>
              <input
                required
                maxLength={255}
                value={formData.label}
                onChange={(event) => updateField("label", event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary"
                placeholder="Ví dụ: Bộ sưu tập mới"
              />
              <span className="block text-right text-xs text-on-surface-variant">
                {formData.label.length}/255
              </span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">
                Tiêu đề <span className="text-error">*</span>
              </span>
              <input
                required
                maxLength={500}
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="w-full rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary"
                placeholder="Tiêu đề nổi bật của banner"
              />
              <span className="block text-right text-xs text-on-surface-variant">
                {formData.title.length}/500
              </span>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">
                Mô tả <span className="text-error">*</span>
              </span>
              <textarea
                required
                maxLength={5000}
                rows={4}
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="w-full resize-y rounded-lg border border-outline-variant px-md py-2.5 outline-none focus:border-primary"
                placeholder="Mô tả ngắn gọn nội dung hoặc bộ sưu tập..."
              />
              <span className="block text-right text-xs text-on-surface-variant">
                {formData.description.length}/5000
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-md sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving || uploading}
              className="rounded-lg border border-outline-variant px-lg py-2.5 font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-primary px-lg py-2.5 font-medium text-on-primary disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : editingBanner
                  ? "Lưu thay đổi"
                  : "Tạo banner"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa banner"
        message={`Bạn có chắc muốn xóa banner “${deleteTarget?.title || ""}”?`}
        confirmText={deleting ? "Đang xóa..." : "Xóa"}
        cancelText="Hủy"
        isDangerous
        onConfirm={deleteBanner}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </main>
  );
};

export default AdminBannerManagementPage;
