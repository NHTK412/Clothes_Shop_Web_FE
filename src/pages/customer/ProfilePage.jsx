import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import ProfileService from "../../services/ProfileService";
import UploadService from "../../services/UploadService";

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

const resolveAvatar = (avatar) => {
    if (!avatar) return "";
    if (/^https?:\/\//i.test(avatar)) return avatar;
    return `${BACKEND_ORIGIN}/${String(avatar).replace(/^\/+/, "")}`;
};

const roleLabel = {
    ROLE_CUSTOMER: "Khách hàng",
    ROLE_ADMIN: "Quản trị viên",
};

const statusLabel = {
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Tạm khóa",
    BANNED: "Bị khóa",
};

const getInitials = (name = "") => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "U";
    return words.slice(-2).map((word) => word[0]).join("").toUpperCase();
};

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        avatar: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchProfile = async () => {
            setIsLoading(true);
            setError("");

            try {
                const response = await ProfileService.getProfile();
                if (!isMounted) return;

                setProfile(response);
                setFormData({
                    name: response?.name || "",
                    phone: response?.phone || "",
                    avatar: response?.avatar || "",
                });
            } catch (err) {
                if (!isMounted) return;
                setError(err?.response?.data?.message || "Không thể tải thông tin cá nhân. Vui lòng thử lại.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => () => {
        if (avatarPreviewUrl) {
            URL.revokeObjectURL(avatarPreviewUrl);
        }
    }, [avatarPreviewUrl]);

    const avatarPreview = useMemo(
        () => avatarPreviewUrl || resolveAvatar(formData.avatar || profile?.avatar),
        [avatarPreviewUrl, formData.avatar, profile?.avatar]
    );

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setMessage("");
        setError("");
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0] || null;
        setAvatarFile(file);
        setMessage("");
        setError("");

        if (avatarPreviewUrl) {
            URL.revokeObjectURL(avatarPreviewUrl);
        }

        setAvatarPreviewUrl(file ? URL.createObjectURL(file) : "");
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        setMessage("");
        setError("");
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            name: profile?.name || "",
            phone: profile?.phone || "",
            avatar: profile?.avatar || "",
        });
        setAvatarFile(null);
        if (avatarPreviewUrl) {
            URL.revokeObjectURL(avatarPreviewUrl);
            setAvatarPreviewUrl("");
        }
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setMessage("");
        setError("");

        try {
            let avatar = formData.avatar.trim();

            if (avatarFile) {
                const uploadResponse = await UploadService.uploadImage(avatarFile);
                avatar = uploadResponse?.image_url || "";

                if (!avatar) {
                    throw new Error("Upload avatar failed");
                }
            }

            const response = await ProfileService.updateProfile({
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                avatar,
            });

            setProfile(response);
            setFormData({
                name: response?.name || "",
                phone: response?.phone || "",
                avatar: response?.avatar || "",
            });
            setAvatarFile(null);
            if (avatarPreviewUrl) {
                URL.revokeObjectURL(avatarPreviewUrl);
                setAvatarPreviewUrl("");
            }
            setIsEditing(false);
            setMessage("Cập nhật thông tin cá nhân thành công.");
        } catch (err) {
            setError(err?.response?.data?.message || "Không thể cập nhật thông tin. Vui lòng kiểm tra lại dữ liệu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
            setError("Vui lòng nhập DELETE để xác nhận xóa tài khoản.");
            return;
        }

        setIsDeleting(true);
        setError("");
        setMessage("");

        try {
            await ProfileService.deleteProfile();
            Cookies.remove("access_token");
            navigate("/");
        } catch (err) {
            setError(err?.response?.data?.message || "Không thể xóa tài khoản. Vui lòng thử lại.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
                <div className="mb-lg h-10 w-64 animate-pulse rounded bg-surface-container-high" />
                <div className="grid gap-md lg:grid-cols-[320px_1fr]">
                    <div className="h-80 animate-pulse border border-outline-variant bg-surface-container-lowest" />
                    <div className="h-96 animate-pulse border border-outline-variant bg-surface-container-lowest" />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-screen max-w-max-width px-margin-mobile py-xl md:px-lg">
            <div className="mb-lg">
                <h1 className="font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
                    Hồ sơ cá nhân
                </h1>
                <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
                    Quản lý thông tin liên hệ và hình ảnh đại diện của tài khoản.
                </p>
            </div>

            {error ? (
                <div className="mb-md border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-error">
                    {error}
                </div>
            ) : null}

            {message ? (
                <div className="mb-md border border-primary/20 bg-primary/5 px-md py-sm text-body-sm text-primary">
                    {message}
                </div>
            ) : null}

            <section className="border border-outline-variant bg-surface-container-lowest">
                <div className="flex flex-col gap-md border-b border-outline-variant p-md md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-md">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-bold text-on-primary">
                            {avatarPreview ? (
                                <img
                                    alt={formData.name || "Avatar"}
                                    className="h-full w-full object-cover"
                                    src={avatarPreview}
                                />
                            ) : (
                                getInitials(formData.name || profile?.name)
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-headline-md text-headline-md text-on-surface">
                                {profile?.name || "Người dùng"}
                            </h2>
                            <p className="mt-1 break-all text-body-md text-on-surface-variant">{profile?.email || "Chưa có email"}</p>
                            <div className="mt-xs flex flex-wrap gap-xs">
                                <span className="rounded-full bg-primary/10 px-sm py-1 text-label-sm text-primary">
                                    {roleLabel[profile?.role] || profile?.role || "Đang cập nhật"}
                                </span>
                                <span className="rounded-full bg-secondary-container px-sm py-1 text-label-sm text-on-secondary-container">
                                    {statusLabel[profile?.status] || profile?.status || "Đang cập nhật"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isEditing ? (
                        <button
                            className="inline-flex items-center justify-center gap-xs rounded-lg border border-primary px-md py-sm font-label-md text-label-md text-primary transition-colors hover:bg-secondary-container"
                            type="button"
                            onClick={handleStartEdit}>
                            <span className="material-symbols-outlined text-base">edit</span>
                            Chỉnh sửa
                        </button>
                    ) : null}
                </div>

                {!isEditing ? (
                    <div className="grid gap-0 md:grid-cols-2">
                        <div className="border-b border-outline-variant p-md md:border-r">
                            <p className="text-label-sm text-on-surface-variant">Họ và tên</p>
                            <p className="mt-1 font-label-md text-label-md text-on-surface">{profile?.name || "Đang cập nhật"}</p>
                        </div>
                        <div className="border-b border-outline-variant p-md">
                            <p className="text-label-sm text-on-surface-variant">Số điện thoại</p>
                            <p className="mt-1 font-label-md text-label-md text-on-surface">{profile?.phone || "Chưa cập nhật"}</p>
                        </div>
                        <div className="border-b border-outline-variant p-md md:border-r md:border-b-0">
                            <p className="text-label-sm text-on-surface-variant">Email</p>
                            <p className="mt-1 break-all font-label-md text-label-md text-on-surface">{profile?.email || "Chưa có email"}</p>
                        </div>
                        <div className="p-md">
                            <p className="text-label-sm text-on-surface-variant">Mã người dùng</p>
                            <p className="mt-1 font-label-md text-label-md text-on-surface">#{profile?.id || "..."}</p>
                        </div>
                    </div>
                ) : (
                    <form className="p-md" onSubmit={handleSubmit}>
                        <div className="mb-md flex items-center justify-between gap-sm border-b border-outline-variant pb-sm">
                            <div>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Chỉnh sửa thông tin</h2>
                                <p className="mt-1 text-body-sm text-on-surface-variant">
                                    Email, vai trò và trạng thái tài khoản chỉ dùng để hiển thị.
                                </p>
                            </div>
                            <button
                                className="inline-flex items-center justify-center gap-xs rounded-lg border border-outline-variant px-sm py-xs text-label-md text-on-surface-variant transition-colors hover:border-primary"
                                type="button"
                                onClick={handleCancelEdit}>
                                <span className="material-symbols-outlined text-base">close</span>
                                Hủy
                            </button>
                        </div>

                        <div className="grid gap-sm md:grid-cols-2">
                            <label className="flex flex-col gap-xs">
                                <span className="font-label-sm text-label-sm text-on-surface">Họ và tên</span>
                                <input
                                    className="rounded-md border border-outline-variant bg-surface px-sm py-sm text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    name="name"
                                    placeholder="Nguyễn Văn A"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </label>

                            <label className="flex flex-col gap-xs">
                                <span className="font-label-sm text-label-sm text-on-surface">Số điện thoại</span>
                                <input
                                    className="rounded-md border border-outline-variant bg-surface px-sm py-sm text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    name="phone"
                                    placeholder="0901234567"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </label>

                            <label className="flex flex-col gap-xs md:col-span-2">
                                <span className="font-label-sm text-label-sm text-on-surface">Avatar</span>
                                <div className="rounded-md border border-dashed border-outline-variant bg-surface px-sm py-sm transition-colors hover:border-primary">
                                    <input
                                        accept="image/*"
                                        className="w-full text-body-sm text-on-surface file:mr-sm file:rounded-md file:border-0 file:bg-primary file:px-sm file:py-xs file:font-label-sm file:text-on-primary"
                                        type="file"
                                        onChange={handleAvatarChange}
                                    />
                                    <p className="mt-xs text-body-sm text-on-surface-variant">
                                        {avatarFile ? `Đã chọn: ${avatarFile.name}` : "Chọn ảnh mới nếu bạn muốn thay avatar."}
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-md flex flex-col-reverse gap-xs sm:flex-row sm:justify-end">
                            <button
                                className="inline-flex items-center justify-center gap-xs rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface-variant transition-colors hover:border-primary"
                                type="button"
                                onClick={handleCancelEdit}>
                                Hủy
                            </button>
                            <button
                                className="inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                                type="submit"
                                disabled={isSaving}>
                                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                                <span className="material-symbols-outlined text-base">save</span>
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section className="mt-md border border-error-container bg-surface-container-lowest p-md">
                <div className="mb-sm flex items-start gap-sm">
                    <span className="material-symbols-outlined text-error">warning</span>
                    <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">Xóa tài khoản</h2>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                            Thao tác này sẽ xóa tài khoản hiện tại và đăng xuất khỏi hệ thống.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-sm sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-xs">
                        <span className="font-label-sm text-label-sm text-on-surface">Nhập DELETE để xác nhận</span>
                        <input
                            className="rounded-md border border-outline-variant bg-surface px-sm py-sm text-body-md outline-none transition-colors focus:border-error focus:ring-2 focus:ring-error/15"
                            type="text"
                            value={deleteConfirm}
                            onChange={(event) => setDeleteConfirm(event.target.value)}
                        />
                    </label>
                    <button
                        className="inline-flex items-center justify-center gap-xs rounded-lg border border-error px-md py-sm font-label-md text-label-md text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDeleteProfile}>
                        {isDeleting ? "Đang xóa..." : "Xóa tài khoản"}
                        <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            </section>
        </main>
    );
};

export default ProfilePage;
