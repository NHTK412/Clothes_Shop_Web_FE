import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import ProfileService from "../../services/ProfileService";

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

    const avatarPreview = useMemo(
        () => resolveAvatar(formData.avatar || profile?.avatar),
        [formData.avatar, profile?.avatar]
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await ProfileService.updateProfile({
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                avatar: formData.avatar.trim(),
            });

            setProfile(response);
            setFormData({
                name: response?.name || "",
                phone: response?.phone || "",
                avatar: response?.avatar || "",
            });
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

            <div className="grid gap-md lg:grid-cols-[320px_1fr]">
                <aside className="border border-outline-variant bg-surface-container-lowest p-md">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-bold text-on-primary">
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
                        <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
                            {profile?.name || "Người dùng"}
                        </h2>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{profile?.email || "Chưa có email"}</p>
                    </div>

                    <div className="mt-md flex flex-col gap-xs border-t border-outline-variant pt-md text-body-sm">
                        <div className="flex justify-between gap-sm">
                            <span className="text-on-surface-variant">Vai trò</span>
                            <span className="font-medium text-on-surface">{roleLabel[profile?.role] || profile?.role || "Đang cập nhật"}</span>
                        </div>
                        <div className="flex justify-between gap-sm">
                            <span className="text-on-surface-variant">Trạng thái</span>
                            <span className="font-medium text-primary">{statusLabel[profile?.status] || profile?.status || "Đang cập nhật"}</span>
                        </div>
                        <div className="flex justify-between gap-sm">
                            <span className="text-on-surface-variant">Mã người dùng</span>
                            <span className="font-medium text-on-surface">#{profile?.id || "..."}</span>
                        </div>
                    </div>
                </aside>

                <section className="flex flex-col gap-md">
                    <form className="border border-outline-variant bg-surface-container-lowest p-md" onSubmit={handleSubmit}>
                        <div className="mb-md border-b border-outline-variant pb-sm">
                            <h2 className="font-headline-sm text-headline-sm text-on-surface">Thông tin có thể chỉnh sửa</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                Email, vai trò và trạng thái tài khoản chỉ dùng để hiển thị.
                            </p>
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
                                <input
                                    className="rounded-md border border-outline-variant bg-surface px-sm py-sm text-body-md outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    name="avatar"
                                    placeholder="users/avatar.jpg hoặc https://..."
                                    type="text"
                                    value={formData.avatar}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>

                        <div className="mt-md flex justify-end">
                            <button
                                className="inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                                type="submit"
                                disabled={isSaving}>
                                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                                <span className="material-symbols-outlined text-base">save</span>
                            </button>
                        </div>
                    </form>

                    <div className="border border-error-container bg-surface-container-lowest p-md">
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
                    </div>
                </section>
            </div>
        </main>
    );
};

export default ProfilePage;
