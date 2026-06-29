import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import ConfirmModal from './ConfirmModal';
import ProfileService from '../../services/ProfileService';

const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');

const resolveAvatar = (avatar) => {
  if (!avatar) return '';
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `${BACKEND_ORIGIN}/${String(avatar).replace(/^\/+/, '')}`;
};

const getDisplayName = (profile) =>
  profile?.name ?? profile?.full_name ?? profile?.username ?? profile?.email ?? 'Quản trị viên';

const getInitials = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'QT';
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase();
};

const getRoleLabel = (profile) => {
  const rawRole = profile?.role ?? profile?.role_name ?? profile?.roles?.[0] ?? Cookies.get('user_role');
  const role = String(rawRole || '').toUpperCase();

  if (['ROLE_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role)) {
    return 'Quản trị viên';
  }

  return rawRole || 'Quản trị viên';
};

const AdminSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const data = await ProfileService.getProfile();
        if (isMounted) {
          setProfile(data);
          setAvatarError(false);
        }
      } catch (error) {
        console.error('Không thể tải thông tin quản trị viên:', error);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Thống kê', icon: 'dashboard', path: '/admin/dashboard' },
    { id: 'products', label: 'Sản phẩm', icon: 'inventory_2', path: '/admin/products' },
    { id: 'promotions', label: 'Khuyến mãi', icon: 'sell', path: '/admin/promotions' },
    { id: 'vouchers', label: 'Voucher', icon: 'confirmation_number', path: '/admin/vouchers' },
    { id: 'orders', label: 'Đơn hàng', icon: 'shopping_cart', path: '/admin/orders' },
    { id: 'customers', label: 'Khách hàng', icon: 'group', path: '/admin/customers' },
    { id: 'categories', label: 'Danh mục', icon: 'category', path: '/admin/categories' },
    { id: 'attributes', label: 'Thuộc tính', icon: 'tune', path: '/admin/attributes' },
    { id: 'settings', label: 'Cài đặt', icon: 'settings', path: '/admin/settings' },
  ];

  const handleMenuClick = (item) => {
    navigate(item.path);
    onClose();
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

  const displayName = getDisplayName(profile);
  const avatarUrl = resolveAvatar(profile?.avatar);
  const roleLabel = getRoleLabel(profile);
  const activeMenu = pathname.split('/')[2] || 'dashboard';

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-outline-variant bg-surface-container-lowest px-3 py-4 shadow-2xl transition-transform duration-200 md:z-40 md:w-20 md:translate-x-0 md:px-2 md:shadow-none lg:w-64 lg:px-4 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo Section */}
      <div className="mb-5 flex min-h-12 items-center justify-between px-2 md:justify-center lg:justify-start">
        <div className="min-w-0">
          <h1 className="truncate font-headline-sm text-headline-sm font-bold text-primary">
            <span className="md:hidden lg:inline">Clothes Shop</span>
            <span className="hidden md:inline lg:hidden">CS</span>
          </h1>
          <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant md:hidden lg:block">
            Hệ thống quản trị
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container md:hidden"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            title={item.label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all md:justify-center md:px-0 lg:justify-start lg:px-3 ${activeMenu === item.id
                ? 'bg-secondary-container font-bold text-primary md:ring-1 md:ring-primary/10 lg:border-r-4 lg:border-primary lg:ring-0'
                : 'text-on-surface-variant hover:bg-surface-container'
              }`}
          >
            <span className="material-symbols-outlined shrink-0">{item.icon}</span>
            <span className="truncate font-label-md text-label-md md:hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile Section with Logout */}
      <div className="mt-3 space-y-2 border-t border-outline-variant pt-3">
        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2 md:justify-center lg:justify-start">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant shrink-0">
            {avatarUrl && !avatarError ? (
              <img
                className="w-full h-full object-cover"
                alt={`Ảnh đại diện của ${displayName}`}
                src={avatarUrl}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-container text-xs font-bold text-primary">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div className="overflow-hidden md:hidden lg:block">
            <p className="text-label-md font-bold truncate" title={displayName}>{displayName}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{roleLabel}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogoutClick}
          title="Đăng xuất"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-label-md text-error transition-all hover:bg-error-container/20 md:justify-center md:px-0 lg:justify-start lg:px-3"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="md:hidden lg:inline">Đăng xuất</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        isDangerous={true}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </aside>
  );
};

export default AdminSidebar;
