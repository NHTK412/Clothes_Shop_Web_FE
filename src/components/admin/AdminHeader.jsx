const AdminHeader = () => {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-gutter z-30 ml-64">
      {/* Search Bar */}
      <div className="relative w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-sm"
          placeholder="Tìm kiếm sản phẩm, đơn hàng..."
          type="text"
        />
      </div>

      {/* Right Icons & Logo */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-all relative">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
        </button>

        {/* Settings Icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-all">
          <span className="material-symbols-outlined text-on-surface-variant">admin_panel_settings</span>
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-outline-variant mx-2"></div>

        {/* Brand Name */}
        <div className="flex items-center gap-2">
          <span className="text-label-md font-bold">LUXE Boutique</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
