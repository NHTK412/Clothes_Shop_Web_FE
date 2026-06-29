/* eslint-disable no-unused-vars */
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined } from "@ant-design/icons";
import { notification, Spin } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/AuthService";

const RegisterPage = () => {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);

    const [loading, setLoading] = useState(false);

    const [isShowPassword, setIsShowPassword] = useState(false);
    const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            setLoading(true);

            const registerData = {
                name,
                email,
                phone,
                password,
                password_confirmation: confirmPassword
            };

            const response = await register(registerData);

            notification.success({
                title: "Đăng ký thành công",
                description: "Bạn đã đăng ký thành công. Chuyển hướng đến trang đăng nhập...",
            });
            navigate('/login');
        } catch (error) {
            notification.error({
                title: "Đăng ký thất bại",
                description: error.response?.data?.message || "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.",
            })
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-grow flex items-center justify-center pt-[30px] pb-xl px-margin-mobile">
            <div className="max-w-max-width w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                <div className="relative hidden h-[600px] overflow-hidden rounded-xl lg:col-span-6 lg:block">
                    <img alt="Fashion Lifestyle" className="absolute inset-0 w-full h-full object-cover"
                        data-alt="A high-end fashion lifestyle image featuring a sophisticated woman walking through a sun-drenched, minimalist architectural space. The color palette is dominated by soft whites and cool blues, reflecting the brand identity. The lighting is bright and airy, creating a professional and premium boutique atmosphere. High-fashion aesthetics are combined with clean lines and a sense of luxury commerce."
                        src="https://noithattugia.com/wp-content/uploads/Dien-tich-nho-nhung-shop-quan-ao-van-mang-lai-cam-giac-nhe-nhang-loi-loi-di-thong-thoang-thoai-mai-nhat.jpg" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                    <div className="absolute inset-0 flex flex-col  justify-end text-white px-lg">
                        <h2 className="text-display-lg font-display-lg mb-sm">Tham gia ngay</h2>
                        <p className="mb-10">Trở thành thành viên ngay hôm nay để nhận
                            được những ưu đãi đặc biệt và quyền lợi độc quyền.</p>
                    </div>
                </div>
                <div className="flex justify-center lg:col-span-6">
                    <div
                        className="w-full max-w-[480px] bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm transition-all duration-300 hover:border-primary">
                        <div className="mb-lg">
                            <h1 className="text-headline-md font-headline-md text-primary mb-xs">Tạo tài khoản mới</h1>
                            <p className="text-body-sm font-body-sm text-secondary">Vui lòng điền thông tin bên dưới để bắt đầu
                                mua sắm.</p>
                        </div>
                        <Spin spinning={loading} tip="Đang đăng ký..." size="large" className="w-full">
                            <form className="space-y-md" onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-xs">
                                    <label className="text-label-sm font-label-sm text-on-surface" for="fullname">Họ và tên</label>
                                    <input
                                        className="w-full px-sm py-xs bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md font-body-md"
                                        id="fullname" placeholder="Nguyễn Văn A" type="text" name="name" onChange={(e) => setName(e.target.value)} value={name} />
                                </div>
                                <div className="flex flex-col gap-xs">
                                    <label className="text-label-sm font-label-sm text-on-surface" for="email">Email</label>
                                    <input
                                        className="w-full px-sm py-xs bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md font-body-md"
                                        id="email" placeholder="example@gmail.com" type="email" name="email" onChange={(e) => setEmail(e.target.value)} value={email} />
                                </div>
                                <div className="flex flex-col gap-xs">
                                    <label className="text-label-sm font-label-sm text-on-surface" for="phone">Số điện
                                        thoại</label>
                                    <input
                                        className="w-full px-sm py-xs bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md font-body-md"
                                        id="phone" placeholder="0123 456 789" type="tel" name="phone" onChange={(e) => setPhone(e.target.value)} value={phone} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                                    <div className="flex flex-col gap-xs">
                                        <label className="text-label-sm font-label-sm text-on-surface" for="password">Mật
                                            khẩu</label>
                                        <div className="relative">
                                            <input
                                                className="w-full px-sm py-xs bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md font-body-md"
                                                id="password" placeholder="••••••••" type={isShowPassword ? "text" : "password"} name="password" onChange={(e) => setPassword(e.target.value)} value={password} />
                                            <button className="absolute right-sm top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                                                type="button" id="toggle-password" onClick={() => setIsShowPassword(!isShowPassword)}>
                                                {
                                                    isShowPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-xs">
                                        <label className="text-label-sm font-label-sm text-on-surface" for="confirm_password">Xác
                                            nhận mật khẩu</label>
                                        <div className="relative">
                                            <input
                                                className="w-full px-sm py-xs bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md font-body-md"
                                                id="confirm_password" placeholder="••••••••" type={isShowConfirmPassword ? "text" : "password"}
                                                name="password_confirmation" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} />
                                            <button className="absolute right-sm top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                                                type="button" id="toggle-password" onClick={() => setIsShowConfirmPassword(!isShowConfirmPassword)}>
                                                {/* <span className="material-symbols-outlined text-[20px]" id="password-icon">visibility</span> */}
                                                {
                                                    isShowConfirmPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />
                                                }
                                            </button>

                                        </div>

                                    </div>
                                </div>
                                <div className="flex items-start gap-xs py-xs">
                                    <input className="mt-1 rounded border-outline-variant text-primary focus:ring-primary"
                                        id="terms" type="checkbox" />
                                    <label className="text-body-sm font-body-sm text-secondary" for="terms">
                                        Tôi đồng ý với <a className="text-primary hover:underline" href="#">Điều khoản dịch
                                            vụ</a> và <a className="text-primary hover:underline" href="#">Chính sách bảo
                                                mật</a>.
                                    </label>
                                </div>
                                <button
                                    className="w-full bg-primary text-on-primary font-label-md text-label-md py-sm rounded-lg hover:bg-primary-container hover:shadow-md transition-all duration-300 transform active:scale-95 flex justify-center items-center gap-xs hover:cursor-pointer"
                                    type="submit" >
                                    <p classNameName="font-label-md mx-10">Đăng ký ngay</p>
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </button>
                            </form>
                        </Spin>
                        <div className="mt-lg pt-lg border-t border-outline-variant flex flex-col items-center gap-sm">
                            <p className="text-body-sm font-body-sm text-secondary">Đã có tài khoản?
                                <a className="text-primary font-bold hover:underline hover:cursor-pointer" onClick={() => navigate('/login')}> Đăng nhập
                                    ngay</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default RegisterPage;
