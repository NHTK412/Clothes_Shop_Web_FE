const ClientFooter = () => {
    return (
        <footer className="bg-surface-container">
            <div className="mx-auto flex max-w-max-width flex-col justify-between gap-8 px-4 py-10 sm:px-6 md:flex-row lg:px-10 lg:py-16">
                <div className="flex flex-col gap-sm lg:min-w-[420px] lg:max-w-lg">
                    <span className="text-headline-sm font-headline-sm text-on-surface">Clothes Shop</span>
                    <p className="text-pretty font-body-sm text-body-sm leading-6 text-secondary">
                        Trải nghiệm thời trang cao cấp với sự tinh tế trong từng đường nét thiết kế.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                    <div className="flex flex-col gap-xs">
                        <span className="font-label-md text-label-md text-on-surface mb-xs">Hỗ trợ</span>
                        <a className="font-body-sm text-body-sm text-secondary  hover:underline decoration-primary"
                            href="#">Liên hệ với chúng tôi</a>
                        <a className="font-body-sm text-body-sm text-secondary  hover:underline decoration-primary"
                            href="#">Chính sách vận chuyển và hoàn trả</a>
                    </div>
                    <div className="flex flex-col gap-xs">
                        <span className="font-label-md text-label-md text-on-surface mb-xs">Pháp lý</span>
                        <a className="font-body-sm text-body-sm text-secondary hover:underline decoration-primary"
                            href="#">Chính sách bảo mật</a>
                        <a className="font-body-sm text-body-sm text-secondary hover:underline decoration-primary"
                            href="#">Điều khoản Dịch vụ</a>
                    </div>
                    <div className="flex flex-col gap-xs">
                        <span className="font-label-md text-label-md text-on-surface mb-xs">Thông tin</span>
                        <a className="font-body-sm text-body-sm text-secondary hover:underline decoration-primary"
                            href="#">Hướng dẫn chọn size</a>
                    </div>
                </div>
            </div>
            <div className="mx-auto flex max-w-max-width justify-center border-t border-outline-variant/30 px-4 py-6 text-center sm:px-6 lg:px-10">
                <p className="font-body-sm text-body-sm text-secondary">© 2026 Clothes Shop. Mọi quyền được bảo lưu.</p>
            </div>
        </footer>
    )
}

export default ClientFooter;
