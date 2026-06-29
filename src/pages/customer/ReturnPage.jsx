import { useState } from "react";
import { Link } from "react-router-dom"

const ReturnPage = () => {
    const [checkoutStep, setCheckoutStep] = useState("complete");

    return (
        <main className="max-w-max-width mx-auto px-margin-mobile md:px-lg py-xl">
            <div className="mb-lg flex flex-col gap-sm md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                        Đặt hàng
                    </p>
                    <h1 className="mt-xs font-display-lg text-display-lg-mobile text-primary md:text-display-lg">
                        Đặt hàng thành công
                    </h1>
                </div>
                <div className="flex items-center gap-xs text-body-sm text-secondary">
                    <Link className="transition-colors hover:text-primary hover:underline" to="/cart">
                        Giỏ hàng
                    </Link>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    <span className={checkoutStep === "checkout" ? "font-label-md text-primary" : ""}>Thanh toán</span>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    <span className={checkoutStep === "complete" ? "font-label-md text-primary" : ""}>Hoàn tất</span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-sm rounded-lg border border-secondary/20 bg-secondary/5 p-lg text-center">
                <span className="material-symbols-outlined text-6xl text-primary">check_circle</span>
                <h2 className="font-display-md text-display-md-mobile text-primary">Đặt hàng thành công</h2>
                <p className="text-body-md text-secondary">
                    Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.
                </p>
            </div>


        </main>
    )
}

export default ReturnPage