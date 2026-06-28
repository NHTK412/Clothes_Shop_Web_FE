/* eslint-disable no-unused-vars */
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined } from "@ant-design/icons";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/AuthService";
import { Button, notification, Spin } from "antd";
import Cookies from "js-cookie";

const LoginPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            setLoading(true);
            const loginData = {
                email,
                password
            };

            const response = await login(loginData);
            const user = response?.user || {};
            const role = String(response?.role || user?.role || user?.role_name || "ROLE_CUSTOMER").toUpperCase();
            const isAdmin = Boolean(
                response?.isAdmin ||
                user?.is_admin === true ||
                user?.isAdmin === true ||
                role === "ROLE_ADMIN" ||
                role === "ADMIN" ||
                role === "SUPER_ADMIN"
            );

            notification.success({
                message: "Đăng nhập thành công",
                description: isAdmin ? "Bạn đã đăng nhập với quyền quản trị. Đang chuyển đến trang quản trị..." : "Bạn đã đăng nhập thành công. Chuyển hướng đến trang chủ...",
            });

            const expiresInDays = Number(response?.expires_in || 7) / (60 * 60 * 24);
            const token = response?.access_token || response?.token;

            console.log("[LoginPage] Login response received:");
            console.log(`  Role detected: ${role}`);
            console.log(`  Is Admin: ${isAdmin}`);
            console.log(`  Token: ${token?.substring(0, 30)}...`);

            if (token) {
                Cookies.set("access_token", token, {
                    expires: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
                    path: "/",
                });
                window.localStorage.setItem("access_token", token);
                console.log("[LoginPage] Token saved to cookies & localStorage");
            }

            Cookies.set("user_role", role, {
                expires: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
                path: "/",
            });
            window.localStorage.setItem("user_role", role);
            console.log(`[LoginPage] Role '${role}' saved to cookies & localStorage`);

            navigate(isAdmin ? "/admin" : "/");

        } catch (error) {
            console.log("Login error:", error);
            notification.error({
                title: "Đăng nhập thất bại",
                description: error.response?.data?.message || "Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.",
            })
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex-grow flex items-center justify-center py-xl px-margin-mobile">
            <div
                className="w-full max-w-[480px] bg-surface-container-lowest login-card rounded-xl p-lg border border-outline-variant">
                <div className="text-center mb-lg">
                    <h1 className="font-headline-md text-headline-md text-on-background mb-xs">Chào Mừng Trở Lại</h1>
                    <p className="font-body-sm text-body-sm text-secondary">Vui lòng đăng nhập để tiếp tục mua sắm</p>
                </div>
                <div className="grid grid-cols-1 gap-sm mb-lg">
                    <button
                        className="flex items-center justify-center gap-xs py-sm border border-outline-variant rounded-lg hover:bg-surface-container-low hover:cursor-pointer transition-colors duration-200 group">
                        <Icon icon="logos:google-icon" width="20" height="20" />
                        <span className="font-label-md text-label-md text-on-surface">Google</span>
                    </button>
                </div>
                <div className="relative flex items-center mb-lg">
                    <div className="flex-grow border-t border-outline-variant"></div>
                    <span className="flex-shrink mx-sm font-label-sm text-label-sm text-secondary">Hoặc bằng Email</span>
                    <div className="flex-grow border-t border-outline-variant"></div>
                </div>
                <Spin spinning={loading} tip="Đang đăng nhập..." size="large" className="w-full">
                    <form className="space-y-md" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-xs">
                            <label className="font-label-sm text-label-sm text-on-surface" for="email">Email của bạn</label>
                            <input
                                className="w-full px-sm py-md bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 outline-none text-body-md"
                                id="email" placeholder="example@luxe.com" required="" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-xs">
                            <div className="flex justify-between items-center">
                                <label className="font-label-sm text-label-sm text-on-surface" for="password">Mật khẩu</label>
                                <a className="font-label-sm text-label-sm text-primary hover:underline" onClick={() => navigate('/forgot-password')}>Quên mật
                                    khẩu?</a>
                            </div>
                            <div className="relative">
                                <input
                                    className="w-full px-sm py-md bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 outline-none text-body-md"
                                    id="password" placeholder="••••••••" required="" type={showPassword ? "text" : "password"} name="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button className="absolute right-sm top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                                    type="button" id="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                    {/* <span className="material-symbols-outlined text-[20px]" id="password-icon">visibility</span> */}
                                    {
                                        showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />
                                    }
                                </button>
                            </div>
                        </div>
                        <button
                            className="w-full py-md bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-all hover:cursor-pointer duration-200 active:scale-[0.98]"
                            type="submit"
                        >
                            <div className="inline ml-3">Đăng nhập</div>
                        </button>
                    </form>
                </Spin>
                <div className="text-center mt-lg">
                    <p className="font-body-sm text-body-sm text-secondary">
                        Bạn chưa có tài khoản?
                        <a className="text-primary font-bold hover:underline hover:cursor-pointer" onClick={() => navigate('/register')}> Đăng ký ngay</a>
                    </p>
                </div>
            </div>
        </main >
    )
}

export default LoginPage;