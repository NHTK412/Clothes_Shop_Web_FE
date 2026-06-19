/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp } from "../../services/AuthService";
import { Spin } from "antd";

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [isCodeSent, setIsCodeSent] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleSendOtpSubmit = async (e) => {
        try {
            e.preventDefault();
            setLoading(true);

            const response = await sendOtp(email);
            setIsCodeSent(true);
        } catch (error) {
            notification.error({
                title: "Gửi yêu cầu thất bại",
                description: error.response?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.",
            })
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex-grow flex items-center justify-center py-xl px-sm">
            <div className="w-full max-w-[480px]">
                <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded shadow-sm">
                    <div className="text-center mb-lg">
                        <div
                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-container text-primary mb-sm">
                            <span className="material-symbols-outlined text-[32px]">lock_reset</span>
                        </div>
                        <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Quên mật khẩu?</h1>
                    </div>
                    {
                        !isCodeSent ? (
                            <Spin spinning={loading} tip="Đang gửi yêu cầu..." size="large" className="w-full">
                                <form className="space-y-md" onSubmit={handleSendOtpSubmit}>
                                    <div className="space-y-xs">
                                        <label
                                            className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider"
                                            for="email">Địa chỉ Email</label>
                                        <div className="relative group">
                                            <input
                                                className="w-full px-sm py-md bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-3 focus:ring-primary/10 outline-none transition-all duration-200 font-body-md text-body-md placeholder:text-outline"
                                                id="email" placeholder="name@example.com" required="" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                            <span
                                                className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                                        </div>
                                    </div>
                                    <button
                                        className="w-full bg-primary text-on-primary py-md px-lg rounded font-label-md text-label-md hover:bg-primary-container transition-all duration-200 active:scale-[0.98] flex justify-center items-center gap-xs hover:cursor-pointer"
                                        type="submit">
                                        Gửi yêu cầu
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    </button>
                                    <div className="hidden animate-in fade-in slide-in-from-top-2 duration-300 p-sm bg-secondary-container/30 border border-secondary-container rounded flex items-start gap-sm"
                                        id="successMessage">
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                        <p className="font-body-sm text-body-sm text-on-secondary-container">
                                            Một email hướng dẫn đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra (bao gồm cả thư rác).
                                        </p>
                                    </div>
                                </form>
                            </Spin>
                        )
                            :
                            (
                                <div className="p-sm bg-secondary-container/30 border border-secondary-container rounded flex items-start gap-sm">
                                    <span className="material-symbols-outlined text-primary">check_circle</span>
                                    <p className="font-body-sm text-body-sm text-on-secondary-container">
                                        Một email hướng dẫn đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra (bao gồm cả thư rác).
                                    </p>
                                </div>
                            )
                    }
                    <div className="mt-lg pt-md border-t border-outline-variant text-center hover:cursor-pointer">
                        <a className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary hover:text-primary transition-colors group"
                            onClick={() => navigate('/login')}>
                            <span
                                className="material-symbols-outlined text-[18px] group-hover:-translate-x-1  transition-transform">arrow_back</span>
                            Quay lại Đăng nhập
                        </a>
                    </div>
                </div>
                <div className="mt-xl hidden md:grid grid-cols-3 gap-sm opacity-20 pointer-events-none">
                    <div className="h-1 bg-primary-fixed rounded-full"></div>
                    <div className="h-1 bg-secondary-fixed rounded-full"></div>
                    <div className="h-1 bg-tertiary-fixed rounded-full"></div>
                </div>
            </div>
        </main>
    );
}

export default ForgotPasswordPage;