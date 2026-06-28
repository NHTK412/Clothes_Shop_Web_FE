import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import CustomerService from '../../services/CustomerService';
import OrderService from '../../services/OrderService';

const normalizeCustomerName = (customer) => {
  if (!customer) return 'Khách hàng';
  return customer.full_name ?? customer.name ?? customer.username ?? customer.email ?? 'Khách hàng';
};

const normalizeCustomerEmail = (customer) => {
  if (!customer) return '-';
  return customer.email ?? customer.email_address ?? customer.username ?? '-';
};

const normalizeCustomerPhone = (customer) => {
  if (!customer) return '-';
  return customer.phone ?? customer.phone_number ?? customer.mobile ?? '-';
};

const normalizeCustomerOrders = (customer) => {
  if (!customer) return [];
  const orders = customer.orders ?? customer.order_history ?? customer.orderHistory ?? customer.orders_data ?? customer.order_list ?? [];
  if (Array.isArray(orders)) return orders;
  if (Array.isArray(orders?.data)) return orders.data;
  if (Array.isArray(orders?.items)) return orders.items;
  return [];
};

const formatMoney = (value) => {
  if (value == null || value === '') return '-';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getStatusLabel = (status) => {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'INACTIVE') return 'Không hoạt động';
  if (status === 'CANCELLED') return 'Đã hủy';
  if (status === 'PENDING_PAYMENT') return 'Chờ thanh toán';
  return status ?? '-';
};

const getStatusBadgeClass = (status) => {
  const statusUpper = (status || '').toUpperCase();
  
  if (statusUpper === 'ACTIVE') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (statusUpper === 'INACTIVE') {
    return 'bg-amber-100 text-amber-800';
  }
  if (statusUpper === 'CANCELLED') {
    return 'bg-red-100 text-red-800';
  }
  if (statusUpper === 'PENDING_PAYMENT') {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const getOrderStatusLabel = (status) => {
  if (status === 'pending') return 'Chờ xử lý';
  if (status === 'processing') return 'Đang xử lý';
  if (status === 'completed') return 'Hoàn thành';
  if (status === 'cancelled') return 'Đã hủy';
  if (status === 'returned') return 'Trả hàng';
  if (status === 'paid') return 'Đã thanh toán';
  return status ?? '-';
};

const getOrderStatusBadgeClass = (status) => {
  const statusLower = (status || '').toLowerCase().trim();
  
  if (statusLower === 'completed' || statusLower === 'hoàn thành') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (statusLower === 'pending' || statusLower === 'chờ xử lý' || statusLower === 'pending_payment' || statusLower === 'chờ thanh toán') {
    return 'bg-amber-100 text-amber-800';
  }
  if (statusLower === 'processing' || statusLower === 'confirmed' || statusLower === 'đang xử lý' || statusLower === 'đang giao') {
    return 'bg-blue-100 text-blue-800';
  }
  if (statusLower === 'cancelled' || statusLower === 'đã hủy') {
    return 'bg-red-100 text-red-800';
  }
  if (statusLower === 'returned' || statusLower === 'trả hàng') {
    return 'bg-purple-100 text-purple-800';
  }
  if (statusLower === 'paid' || statusLower === 'đã thanh toán') {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-gray-100 text-gray-800';
};

const AdminCustomerDetailPage = () => {
  const { id } = useParams();
  const [activeMenu, setActiveMenu] = useState('customers');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiOrderHistory, setApiOrderHistory] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const customerOrderHistory = normalizeCustomerOrders(customer);
  const orderHistory = apiOrderHistory.length > 0 ? apiOrderHistory : customerOrderHistory;

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await CustomerService.getCustomer(id);
        setCustomer(data ?? null);
      } catch (err) {
        console.error('Failed to load customer detail:', err);
        setError('Không thể tải thông tin khách hàng. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCustomer();
    }
  }, [id]);

  useEffect(() => {
    const fetchCustomerOrders = async () => {
      if (!id) return;

      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const response = await OrderService.getAdminCustomerOrders(id, {
          page: 1,
          per_page: 15,
        });

        setApiOrderHistory(response.items ?? []);
      } catch (err) {
        console.error('Failed to load customer orders:', err);
        setOrdersError('Không thể tải lịch sử đơn hàng.');
        setApiOrderHistory([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchCustomerOrders();
  }, [id]);
  const latestOrderDate = orderHistory.length
    ? orderHistory
        .map((order) => new Date(order.created_at ?? order.createdAt ?? order.created))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  const averageOrderValue = customer?.total_orders > 0 && customer?.total_spent
    ? Number(customer.total_spent) / Number(customer.total_orders)
    : 0;

  return (
    <div className="flex">
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="pt-16 min-h-screen bg-surface py-lg">
          <div className="p-lg max-w-[1280px] mx-auto">
            <nav className="flex items-center gap-2 text-label-sm text-on-surface-variant mb-md">
              <Link className="hover:text-primary" to="/admin">Trang chủ</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <Link className="hover:text-primary" to="/admin/customers">Khách hàng</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Chi tiết khách hàng</span>
            </nav>

            {loading ? (
              <div className="rounded-3xl border border-outline-variant bg-surface-container p-md text-center text-on-surface-variant">
                Đang tải thông tin khách hàng...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-error-container bg-error-container/10 p-md text-error">
                {error}
              </div>
            ) : !customer ? (
              <div className="rounded-3xl border border-outline-variant bg-surface-container p-md text-center text-on-surface-variant">
                Không tìm thấy khách hàng.
              </div>
            ) : (
              <>
                <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant mb-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                  <div className="flex items-center gap-md">
                    <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-primary text-headline-md font-bold">
                      {customer.avatar ? (
                        <img src={customer.avatar} alt={normalizeCustomerName(customer)} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        normalizeCustomerName(customer).charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-sm mb-1">
                        <h2 className="text-headline-md font-bold">{normalizeCustomerName(customer)}</h2>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider ${getStatusBadgeClass(customer.status)}`}>
                          {getStatusLabel(customer.status)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">mail</span>
                          {normalizeCustomerEmail(customer)}
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">call</span>
                          {normalizeCustomerPhone(customer)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
                  <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-1">Tổng chi tiêu</p>
                    <p className="text-headline-md font-bold text-primary">{formatMoney(customer.total_spent ?? 0)}</p>
                    <p className="text-[12px] text-green-600 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      {customer.total_spent ? '+12% so với tháng trước' : 'Chưa có chi tiêu'}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-1">Tổng số đơn hàng</p>
                    <p className="text-headline-md font-bold">{customer.total_orders ?? customer.order_count ?? customer.orders_count ?? 0}</p>
                    <p className="text-[12px] text-on-surface-variant mt-2">Đơn hàng gần nhất: {latestOrderDate ? formatDate(latestOrderDate) : 'Không có'}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-1">Giá trị đơn hàng trung bình</p>
                    <p className="text-headline-md font-bold">{formatMoney(averageOrderValue)}</p>
                    <p className="text-[12px] text-on-surface-variant mt-2 flex items-center gap-1">
                      Dựa trên toàn bộ lịch sử mua hàng
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
                  <div className="flex border-b border-outline-variant px-md">
                    <button className="px-md py-4 text-label-md tab-active">Lịch sử đơn hàng</button>
                    <button className="px-md py-4 text-label-md text-on-surface-variant hover:text-primary transition-colors">Thông tin cá nhân</button>
                    <button className="px-md py-4 text-label-md text-on-surface-variant hover:text-primary transition-colors">Ghi chú nội bộ</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-surface-container-low border-b border-outline-variant">
                        <tr>
                          <th className="px-md py-3 text-label-sm text-on-surface-variant font-semibold">Mã đơn hàng</th>
                          <th className="px-md py-3 text-label-sm text-on-surface-variant font-semibold">Ngày đặt</th>
                          <th className="px-md py-3 text-label-sm text-on-surface-variant font-semibold">Tổng cộng</th>
                          <th className="px-md py-3 text-label-sm text-on-surface-variant font-semibold">Trạng thái</th>
                          <th className="px-md py-3 text-label-sm text-on-surface-variant font-semibold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {ordersLoading ? (
                          <tr>
                            <td colSpan="5" className="px-md py-8 text-center text-on-surface-variant">
                              Đang tải lịch sử đơn hàng...
                            </td>
                          </tr>
                        ) : orderHistory.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-md py-8 text-center text-on-surface-variant">
                              {ordersError ? ordersError : 'Chưa có đơn hàng.'}
                            </td>
                          </tr>
                        ) : (
                          orderHistory.map((order) => (
                            <tr key={order.id ?? order.order_code} className="hover:bg-surface-container-low transition-colors">
                              <td className="px-md py-4 text-body-sm font-semibold text-primary">{order.order_code ?? `#ORD-${order.id}`}</td>
                              <td className="px-md py-4 text-body-sm text-on-surface">{formatDate(order.created_at ?? order.createdAt ?? order.created)}</td>
                              <td className="px-md py-4 text-body-sm text-on-surface">{formatMoney(order.final_price ?? order.total_price ?? 0)}</td>
                              <td className="px-md py-4">
                                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full uppercase ${getOrderStatusBadgeClass(order.status)}`}>
                                  {getOrderStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="px-md py-4 text-right">
                                <div className="flex justify-end">
                                  <Link to={`/admin/orders/${order.id}`}>
                                    <button className="p-2 text-outline hover:text-primary transition-colors">
                                      <span className="material-symbols-outlined">visibility</span>
                                    </button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-md py-3 flex justify-between items-center bg-surface-container-low">
                    <p className="text-label-sm text-on-surface-variant">Hiển thị {orderHistory.length} đơn hàng</p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 border border-outline-variant rounded bg-white text-label-sm disabled:opacity-50" disabled>
                        Trước
                      </button>
                      <button className="px-3 py-1 border border-outline-variant rounded bg-white text-label-sm hover:bg-surface-container-high transition-colors">
                        Sau
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCustomerDetailPage;
