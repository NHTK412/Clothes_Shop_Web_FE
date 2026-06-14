/* eslint-disable no-unused-vars */
import { notification, Spin } from "antd";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/AuthService";

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            setLoading(true);

            const resetData = {
                token,
                email,
                password,
                password_confirmation: confirmPassword
            };

            const response = await resetPassword(resetData);

            notification.success({
                title: "Cập nhật mật khẩu thành công",
                description: "Mật khẩu của bạn đã được cập nhật thành công. Chuyển hướng đến trang đăng nhập...",
            });
            navigate('/login');
        } catch (error) {
            notification.error({
                title: "Cập nhật mật khẩu thất bại",
                description: error.response?.data?.message || "Có lỗi xảy ra khi cập nhật mật khẩu. Vui lòng thử lại.",
            })
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex-grow flex items-center justify-center px-margin-mobile py-xl md:py-lg">
            <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-lg">
                <div className="text-center mb-lg">
                    <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Đặt lại mật khẩu</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Vui lòng nhập mật khẩu mới của bạn bên dưới.</p>
                </div>
                <Spin spinning={loading} tip="Đang cập nhật mật khẩu..." size="large" className="w-full">
                    <form className="space-y-md" onSubmit={handleSubmit}>
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="email" value={email} />
                        <div className="space-y-xs">
                            <label className="block font-label-sm text-label-sm text-on-surface-variant" for="new_password">Mật khẩu mới</label>
                            <div className="relative group">
                                <input className="w-full h-12 px-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all duration-200 font-body-md text-body-md" id="new_password" placeholder="Nhập mật khẩu mới" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors" onclick="togglePassword('new_password')" type="button">
                                    <span className="material-symbols-outlined" data-icon="visibility" id="eye_icon_new">visibility</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-xs">
                            <label className="block font-label-sm text-label-sm text-on-surface-variant" for="confirm_password">Xác nhận mật khẩu mới</label>
                            <div className="relative group">
                                <input className="w-full h-12 px-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all duration-200 font-body-md text-body-md" id="confirm_password" placeholder="Xác nhận lại mật khẩu" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                <button className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors" onclick="togglePassword('confirm_password')" type="button">
                                    <span className="material-symbols-outlined" data-icon="visibility" id="eye_icon_confirm">visibility</span>
                                </button>
                            </div>
                        </div>
                        <button className="w-full py-md px-lg bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-on-primary-fixed-variant transition-all duration-150 transform active:scale-[0.98] shadow-sm" type="submit">
                            Cập nhật mật khẩu
                        </button>
                        <div className="pt-sm text-center">
                            <a className="inline-flex items-center gap-xs text-primary font-label-md text-label-md hover:underline decoration-primary" onClick={() => navigate("/login")}>
                                <span className="material-symbols-outlined text-[18px]" data-icon="arrow_back">arrow_back</span>
                                Quay lại Đăng nhập
                            </a>
                        </div>
                    </form>
                </Spin>
            </div>
        </main>
    );
}
export default ResetPasswordPage;