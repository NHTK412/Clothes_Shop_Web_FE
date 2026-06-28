import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import ConfirmModal from './ConfirmModal';

const AdminSidebar = ({ activeMenu, setActiveMenu }) => {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
    { id: 'products', label: 'Products', icon: 'inventory_2', path: '/admin/products' },
    { id: 'orders', label: 'Orders', icon: 'shopping_cart', path: '/admin/orders' },
    { id: 'customers', label: 'Customers', icon: 'group', path: '/admin/customers' },
    { id: 'categories', label: 'Categories', icon: 'category', path: '/admin/categories' },
    { id: 'settings', label: 'Settings', icon: 'settings', path: '/admin/settings' },
  ];

  const handleMenuClick = (item) => {
    setActiveMenu(item.id);
    navigate(item.path);
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    // Clear tokens and role from cookies and localStorage
    Cookies.remove('access_token');
    Cookies.remove('token');
    Cookies.remove('user_role');
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user_role');

    // Close modal and navigate to login
    setIsLogoutModalOpen(false);
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-md px-sm z-40">
      {/* Logo Section */}
      <div className="mb-lg px-xs">
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary">LUXE Boutique</h1>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">Admin Console</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`w-full flex items-center gap-3 px-xs py-3 rounded transition-all text-left ${
              activeMenu === item.id
                ? 'text-primary font-bold border-r-4 border-primary bg-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md text-label-md">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile Section with Logout */}
      <div className="mt-auto space-y-2">
        <div className="p-xs bg-surface-container-low rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img
              className="w-full h-full object-cover"
              alt="Admin profile"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDslQaV_hGIYocLm7U3P9dTXwmXMU6u7eqxr4ysQmrDP7EuhY8w_Sm7hvOBrLIAL8JCAFsZyPhLZ--bs8kTIi2DjslPTlf_IXmpCE3b32-9xm1Flsf9Gflsrt9CbB9f3c_etNNyLmcsoRAo3gFTf1KUf4eGChOlX18ixaoRT_tkwK6EGKhqMHoG7GvikvASzNlIWK539TH3LDcwvI34XbMRURi6_u5QETFbNuauBfrU9vGEdyiVccJUWmASbV031SHRBFha24o5zy_x"
            />
          </div>
          <div className="overflow-hidden">
            <p className="text-label-md font-bold truncate">Admin User</p>
            <p className="text-label-sm text-on-surface-variant truncate">quản trị viên</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-3 px-xs py-3 rounded transition-all text-left text-error hover:bg-error-container/20 font-label-md"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng Xuất</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?"
        confirmText="Đăng Xuất"
        cancelText="Hủy"
        isDangerous={true}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </aside>
  );
};

export default AdminSidebar;
