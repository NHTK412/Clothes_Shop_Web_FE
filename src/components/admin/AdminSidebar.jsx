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

const AdminSidebar = () => {
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
    { id: 'settings', label: 'Cài đặt', icon: 'settings', path: '/admin/settings' },
  ];

  const handleMenuClick = (item) => {
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

  const displayName = getDisplayName(profile);
  const avatarUrl = resolveAvatar(profile?.avatar);
  const roleLabel = getRoleLabel(profile);
  const activeMenu = pathname.split('/')[2] || 'dashboard';

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-md px-sm z-40">
      {/* Logo Section */}
      <div className="mb-lg px-xs">
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary">Clothes Shop</h1>
        <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">Hệ thống quản trị</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`w-full flex items-center gap-3 px-xs py-3 rounded transition-all text-left ${activeMenu === item.id
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
          <div className="overflow-hidden">
            <p className="text-label-md font-bold truncate" title={displayName}>{displayName}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{roleLabel}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-3 px-xs py-3 rounded transition-all text-left text-error hover:bg-error-container/20 font-label-md"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Đăng xuất</span>
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
