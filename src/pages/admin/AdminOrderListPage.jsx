import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderService from '../../services/OrderService';

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

const normalizeOrderStatus = (status) => {
  const normalized = `${status ?? ''}`.toLowerCase();
  if (['pending', 'pending_payment', 'chờ xử lý', 'chờ thanh toán'].includes(normalized)) return 'pending_payment';
  if (['processing', 'confirmed', 'đang xử lý', 'đã xác nhận'].includes(normalized)) return 'confirmed';
  if (['shipping', 'đang giao'].includes(normalized)) return 'shipping';
  if (['completed', 'hoàn thành', 'done'].includes(normalized)) return 'completed';
  if (['cancelled', 'canceled', 'cancel', 'đã hủy'].includes(normalized)) return 'cancelled';
  if (['returned', 'return', 'trả hàng'].includes(normalized)) return 'returned';
  return normalized || 'unknown';
};

const getOrderStatusLabel = (status) => {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case 'pending_payment':
      return 'Chờ thanh toán';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'shipping':
      return 'Đang giao';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    case 'returned':
      return 'Trả hàng';
    default:
      return status ?? '-';
  }
};

const getOrderStatusClasses = (status) => {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case 'pending_payment':
      return 'bg-amber-100 text-amber-700';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700';
    case 'shipping':
      return 'bg-cyan-100 text-cyan-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'returned':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
};

const mapStatusFilter = (filter) => {
  switch (filter) {
    case 'pending_payment':
      return 'pending_payment';
    case 'confirmed':
      return 'confirmed';
    case 'shipping':
      return 'shipping';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'returned':
      return 'returned';
    default:
      return undefined;
  }
};

const AdminOrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const fetchOrders = async (targetPage = 1, targetPerPage = 10, targetStatus = 'all', targetSearch = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: targetPage,
        per_page: targetPerPage,
        status: mapStatusFilter(targetStatus),
      };

      if (targetSearch.trim()) {
        params.search = targetSearch.trim();
      }

      const response = await OrderService.getAdminOrders(params);
      const list = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      const paginationData = response?.pagination ?? response?.data?.pagination ?? response?.data?.data?.pagination ?? null;

      setOrders(Array.isArray(list) ? list : []);
      setPagination(paginationData);
      setPage(targetPage);
      setPerPage(targetPerPage);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
      setOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, perPage, statusFilter, searchQuery);
  }, []);

  const customerDisplayName = (order) => order?.customer?.name ?? order?.full_name ?? order?.user?.name ?? 'Khách hàng';
  const customerEmail = (order) => order?.customer?.email ?? order?.user?.email ?? '-';
  const orderCode = (order) => order?.order_code ?? `#ORD-${order.id}`;

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order) => normalizeOrderStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    if (!sortConfig?.key) return sorted;

    sorted.sort((a, b) => {
      const getValue = (item) => {
        switch (sortConfig.key) {
          case 'order_code':
            return String(orderCode(item)).toLowerCase();
          case 'customer':
            return String(customerDisplayName(item)).toLowerCase();
          case 'created_at':
            return new Date(item.created_at ?? item.createdAt ?? item.created ?? 0).getTime();
          case 'total':
            return Number(item.final_price ?? item.total_price ?? item.price ?? 0);
          case 'status':
            return String(getOrderStatusLabel(item.status)).toLowerCase();
          default:
            return '';
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [filteredOrders, sortConfig]);

  const [globalRevenue, setGlobalRevenue] = useState(0);

  const fetchGlobalRevenue = async () => {
    try {
      // Use backend summary endpoint to get aggregated revenue (recommended)
      // Request completed orders summary specifically.
      const resp = await OrderService.getAdminOrdersSummary({ status: 'COMPLETED' });
      const total = resp?.data?.total_revenue ?? resp?.total_revenue ?? resp?.total ?? 0;
      setGlobalRevenue(Number(total) || 0);
    } catch (err) {
      console.error('Failed to fetch global revenue:', err);
      setGlobalRevenue(0);
    }
  };

  const counts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const normalized = normalizeOrderStatus(order.status);
        if (normalized === 'pending_payment') acc.pendingPayment += 1;
        if (normalized === 'confirmed') acc.confirmed += 1;
        if (normalized === 'shipping') acc.shipping += 1;
        if (normalized === 'completed') acc.completed += 1;
        if (normalized === 'cancelled') acc.cancelled += 1;
        if (normalized === 'returned') acc.returned += 1;
        return acc;
      },
      { pendingPayment: 0, confirmed: 0, shipping: 0, completed: 0, cancelled: 0, returned: 0 }
    );
  }, [orders]);

  useEffect(() => {
    // Fetch aggregated revenue from backend summary API on mount.
    fetchGlobalRevenue();
  }, []);

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    fetchOrders(1, perPage, nextStatus, searchQuery);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchOrders(1, perPage, statusFilter, searchQuery);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination && newPage > pagination.last_page)) return;
    fetchOrders(newPage, perPage, statusFilter, searchQuery);
  };

  return (
    <main className="pt-16 min-h-screen bg-surface">
      <div className="p-lg max-w-[1280px] mx-auto w-full space-y-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-background">Quản lý đơn hàng</h2>
                <p className="text-body-md text-secondary mt-1">Theo dõi đơn hàng, trạng thái thanh toán và doanh thu từ khách hàng.</p>
              </div>
              <button
                onClick={() => fetchOrders(1, perPage, statusFilter, searchQuery)}
                className="flex items-center justify-center gap-2 px-md py-2 border border-primary text-primary rounded-lg hover:bg-secondary-container transition-all"
              >
                <span className="material-symbols-outlined">refresh</span>
                Làm mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
                <p className="text-label-sm text-secondary">Tổng đơn hàng</p>
                <h3 className="text-headline-md font-headline-md mt-1">{pagination?.total ?? orders.length}</h3>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
                <p className="text-label-sm text-secondary">Chờ thanh toán</p>
                <h3 className="text-headline-md font-headline-md mt-1">{counts.pendingPayment}</h3>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
                <p className="text-label-sm text-secondary">Đã xác nhận</p>
                <h3 className="text-headline-md font-headline-md mt-1">{counts.confirmed}</h3>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
                <p className="text-label-sm text-secondary">Đang giao</p>
                <h3 className="text-headline-md font-headline-md mt-1">{counts.shipping}</h3>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
                <p className="text-label-sm text-secondary">Doanh thu</p>
                <h3 className="text-headline-md font-headline-md mt-1">{formatMoney(globalRevenue)}</h3>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="p-md border-b border-outline-variant flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'pending_payment', label: 'Chờ thanh toán' },
                    { value: 'confirmed', label: 'Đã xác nhận' },
                    { value: 'shipping', label: 'Đang giao' },
                    { value: 'completed', label: 'Hoàn thành' },
                    { value: 'cancelled', label: 'Đã hủy' },
                    { value: 'returned', label: 'Trả hàng' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleStatusChange(item.value)}
                      className={`px-md py-2 rounded-lg text-label-sm transition-all ${
                        statusFilter === item.value
                          ? 'bg-primary text-on-primary'
                          : 'border border-outline-variant hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Tìm tên khách hàng hoặc email"
                      className="w-full md:w-72 bg-surface-container border-none rounded-lg py-2 pl-10 pr-4 text-body-sm focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button type="submit" className="px-md py-2 bg-primary text-on-primary rounded-lg text-label-sm">
                    Tìm
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-bright border-b border-outline-variant">
                    <tr>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('order_code')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Mã đơn
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'order_code' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('customer')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Khách hàng
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'customer' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('created_at')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Ngày đặt
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('total')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Tổng tiền
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('status')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Trạng thái
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-md py-8 text-center text-on-surface-variant">Đang tải đơn hàng...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="px-md py-8 text-center text-error">{error}</td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-md py-8 text-center text-on-surface-variant">Không có đơn hàng nào phù hợp.</td>
                      </tr>
                    ) : (
                      sortedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-surface-container transition-colors">
                          <td className="px-md py-4 font-label-md text-primary font-bold">{orderCode(order)}</td>
                          <td className="px-md py-4">
                            <div>
                              <p className="font-body-md font-medium">{customerDisplayName(order)}</p>
                              <p className="text-label-sm text-secondary">{customerEmail(order)}</p>
                            </div>
                          </td>
                          <td className="px-md py-4 text-body-md">{formatDate(order.created_at ?? order.createdAt ?? order.created)}</td>
                          <td className="px-md py-4 text-body-md font-bold">{formatMoney(order.final_price ?? order.total_price ?? 0)}</td>
                          <td className="px-md py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${getOrderStatusClasses(order.status)}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-md py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link to={`/admin/orders/${order.id}`}>
                                <button className="p-2 text-outline hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined">visibility</span>
                                </button>
                              </Link>
                              <Link to={order.user_id ? `/admin/customers/${order.user_id}` : '/admin/customers'}>
                                <button className="p-2 text-outline hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined">person</span>
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

              <div className="p-md border-t border-outline-variant flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-body-sm text-secondary">
                  Hiển thị {filteredOrders.length} đơn hàng{pagination ? ` trên tổng ${pagination.total ?? 0}` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!pagination || page <= 1}
                    className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-2 text-label-sm">Trang {pagination?.current_page ?? page}</span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!pagination || page >= pagination.last_page}
                    className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
      </div>
    </main>
  );
};

export default AdminOrderListPage;
