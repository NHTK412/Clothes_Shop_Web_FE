import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  dashboard: "Thống kê",
  products: "Sản phẩm",
  promotions: "Khuyến mãi",
  vouchers: "Voucher",
  orders: "Đơn hàng",
  customers: "Khách hàng",
  categories: "Danh mục",
  attributes: "Thuộc tính",
  settings: "Cài đặt",
};

const AdminHeader = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const section = pathname.split("/")[2] || "dashboard";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant bg-surface/90 px-4 backdrop-blur-md md:left-20 md:px-5 lg:left-64 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Mở menu quản trị"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <p className="min-w-0 flex-1 truncate text-base font-semibold text-on-surface sm:hidden">
        {PAGE_TITLES[section] ?? "Quản trị"}
      </p>

      <div className="relative hidden w-full max-w-sm flex-1 sm:block lg:max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-sm"
          placeholder="Tìm kiếm sản phẩm, đơn hàng..."
          type="text"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <button
          type="button"
          aria-label="Thông báo"
          className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
        </button>

        <button
          type="button"
          aria-label="Tài khoản quản trị"
          className="hidden h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-surface-container sm:flex"
        >
          <span className="material-symbols-outlined text-on-surface-variant">admin_panel_settings</span>
        </button>

        <div className="mx-1 hidden h-8 w-px bg-outline-variant lg:block"></div>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-label-md font-bold">LUXE Boutique</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
