import { useNavigate } from 'react-router-dom';

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}₫`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const getStatusBadgeClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'COMPLETED' || normalized === 'HOÀN THÀNH') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (normalized === 'PENDING_PAYMENT' || normalized === 'PENDING' || normalized === 'CHỜ THANH TOÁN') {
    return 'bg-amber-100 text-amber-800';
  }
  if (normalized === 'PROCESSING' || normalized === 'CONFIRMED' || normalized === 'ĐANG XỬ LÝ' || normalized === 'ĐANG GIAO') {
    return 'bg-blue-100 text-blue-800';
  }
  if (normalized === 'CANCELLED' || normalized === 'ĐÃ HỦY') {
    return 'bg-red-100 text-red-800';
  }
  if (normalized === 'RETURNED' || normalized === 'TRẢ HÀNG' || normalized === 'ĐÃ HỦY') {
    return 'bg-purple-100 text-purple-800';
  }
  if (normalized === 'PAID' || normalized === 'ĐÃ THANH TOÁN') {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const getNameFromCustomer = (customer) => {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if (typeof customer === 'object') {
    return customer.full_name ?? customer.name ?? customer.email ?? customer.username ?? customer.phone ?? 'Khách hàng';
  }
  return String(customer);
};

const getStatusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PENDING_PAYMENT') return 'Chờ thanh toán';
  if (normalized === 'CONFIRMED') return 'Đã xác nhận';
  if (normalized === 'COMPLETED') return 'Hoàn thành';
  if (normalized === 'CANCELLED') return 'Đã hủy';
  if (normalized === 'SHIPPING') return 'Đang giao';
  return status || 'Không rõ';
};

const OrdersTable = ({ orders = [], isLoading = false, onViewAll }) => {
  const navigate = useNavigate();

  const handleViewAll = () => {
    navigate('/admin/orders');
    if (onViewAll) onViewAll();
  };

  const handleViewDetail = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  return (
    <section className="bg-white rounded-xl border border-outline-variant overflow-hidden">
      <div className="p-md flex justify-between items-center border-b border-outline-variant">
        <h3 className="font-headline-sm text-on-surface">Đơn hàng gần đây</h3>
        <button
          type="button"
          onClick={handleViewAll}
          className="text-primary font-label-md hover:underline transition-all"
        >
          Xem tất cả
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Mã đơn hàng</th>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Khách hàng</th>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Ngày đặt</th>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Tổng cộng</th>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Trạng thái</th>
              <th className="px-md py-4 font-label-md text-on-surface-variant">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-md py-6 text-center text-on-surface-variant">Đang tải dữ liệu...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-md py-6 text-center text-on-surface-variant">Chưa có đơn hàng nào trong khoảng thời gian này.</td>
              </tr>
            ) : (
              orders
                .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
                .slice(0, 5)
                .map((order) => (
                <tr key={order.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-md py-4 font-bold text-primary">#ORD-{order.id}</td>
                  <td className="px-md py-4 text-body-sm">{order.full_name || getNameFromCustomer(order.customer) || 'Khách hàng'}</td>
                  <td className="px-md py-4 text-body-sm">{formatDate(order.created_at || order.createdAt)}</td>
                  <td className="px-md py-4 font-bold">{formatCurrency(order.final_price || order.total_price || 0)}</td>
                  <td className="px-md py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-md py-4">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(order.id)}
                      className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all text-xl"
                      title="Xem chi tiết đơn hàng"
                    >
                      arrow_outward
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default OrdersTable;
