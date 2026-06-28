import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import CustomerService from '../../services/CustomerService';

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

const normalizeCreatedAt = (customer) => {
  const date = customer?.created_at ?? customer?.createdAt ?? customer?.created ?? customer?.createdAt;
  if (!date) return '-';
  return new Date(date).toLocaleDateString('vi-VN');
};

const AdminCustomerListPage = () => {
  const [activeMenu, setActiveMenu] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const fetchCustomers = async (fetchPage = 1, fetchPerPage = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await CustomerService.getCustomers({ per_page: fetchPerPage, page: fetchPage });
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const paginationData = response?.pagination ?? response?.data?.pagination ?? response?.items?.pagination ?? null;
      setCustomers(Array.isArray(list) ? list : []);
      setPagination(paginationData);
      setPage(fetchPage);
      setPerPage(fetchPerPage);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
      setCustomers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page, perPage);
  }, []);

  const totalCustomers = pagination?.total ?? customers.length;
  const customersThisMonth = customers.filter((customer) => {
    const date = new Date(customer?.created_at ?? customer?.createdAt ?? customer?.created ?? customer?.updated_at ?? customer?.updatedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const averageSpend = customers.reduce((sum, customer) => {
    const value = Number(customer?.total_spent ?? customer?.total_spent_vnd ?? customer?.total_spent_value ?? customer?.total_spent_amount ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0) / Math.max(customers.length, 1);
  const lastActiveLabel = (customer) => {
    const date = new Date(customer?.last_active_at ?? customer?.updated_at ?? customer?.updatedAt ?? customer?.created_at ?? customer?.createdAt ?? customer?.created ?? null);
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  };

  const sortedCustomers = useMemo(() => {
    const sorted = [...customers];
    if (!sortConfig?.key) return sorted;

    sorted.sort((a, b) => {
      const getValue = (item) => {
        switch (sortConfig.key) {
          case 'name':
            return normalizeCustomerName(item).toLowerCase();
          case 'status':
            return String(item.status ?? '').toLowerCase();
          case 'orders':
            return Number(item.total_orders ?? item.order_count ?? item.orders_count ?? 0);
          case 'total_spent':
            return Number(item.total_spent ?? item.total_spent_vnd ?? item.total_spent_value ?? item.total_spent_amount ?? 0);
          case 'last_active': {
            const date = new Date(item?.last_active_at ?? item?.updated_at ?? item?.updatedAt ?? item?.created_at ?? item?.createdAt ?? item?.created ?? null);
            return date.getTime() || 0;
          }
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
  }, [customers, sortConfig]);

  const canPrev = page > 1;
  const canNext = pagination ? page < pagination.last_page : false;

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
    fetchCustomers(newPage, perPage);
  };

  return (
    <div className="flex">
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="flex-1 ml-64">
        <AdminHeader />
        <main className="pt-16 min-h-screen bg-surface">
          <div className="p-lg max-w-[1280px] mx-auto w-full space-y-lg">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-background">Quản lý khách hàng</h2>
                <p className="text-body-md text-secondary mt-1">Tổng cộng {totalCustomers.toLocaleString('vi-VN')} khách hàng trong hệ thống</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-md py-2 border border-primary text-primary font-label-md rounded-lg hover:bg-secondary-container transition-all">
                  <span className="material-symbols-outlined">download</span> Xuất báo cáo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-primary transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="bg-secondary-container p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">person_add</span>
                  </div>
                  <span className="text-success text-body-sm text-[#10b981] font-bold">+12%</span>
                </div>
                <div className="mt-4">
                  <p className="text-label-sm text-secondary">Khách hàng mới (Tháng này)</p>
                  <h3 className="text-headline-md font-headline-md mt-1">{customersThisMonth}</h3>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-primary transition-colors">
                <div className="flex justify-between items-start">
                  <div className="bg-secondary-container p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">sync</span>
                  </div>
                  <span className="text-success text-body-sm text-[#10b981] font-bold">+2.4%</span>
                </div>
                <div className="mt-4">
                  <p className="text-label-sm text-secondary">Tỷ lệ duy trì</p>
                  <h3 className="text-headline-md font-headline-md mt-1">84.2%</h3>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-primary transition-colors">
                <div className="flex justify-between items-start">
                  <div className="bg-secondary-container p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">payments</span>
                  </div>
                  <span className="text-success text-body-sm text-[#10b981] font-bold">+5.1%</span>
                </div>
                <div className="mt-4">
                  <p className="text-label-sm text-secondary">Chi tiêu trung bình</p>
                  <h3 className="text-headline-md font-headline-md mt-1">{formatMoney(averageSpend)}</h3>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="p-md border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 flex-wrap">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none bg-surface-container border-none rounded-lg px-4 py-2 pr-10 text-body-sm font-label-md text-on-surface-variant focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Không hoạt động</option>
                      <option value="suspended">Đã khóa</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                  <div className="relative">
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="appearance-none bg-surface-container border-none rounded-lg px-4 py-2 pr-10 text-body-sm font-label-md text-on-surface-variant focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">Cấp bậc thành viên</option>
                      <option value="diamond">Diamond</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined">sort</span></button>
                  <button className="p-2 text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined">filter_list</span></button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-bright border-b border-outline-variant">
                    <tr>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('name')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Khách hàng
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
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
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('orders')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Số đơn hàng
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'orders' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('total_spent')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Tổng chi tiêu
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'total_spent' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('last_active')}
                          className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
                        >
                          Hoạt động cuối
                          <span className="material-symbols-outlined text-[16px]">
                            {sortConfig.key === 'last_active' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </button>
                      </th>
                      <th className="px-md py-4 font-label-md text-label-md text-secondary uppercase tracking-wider text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-md py-8 text-center text-on-surface-variant">Đang tải khách hàng...</td>
                      </tr>
                    ) : customers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-md py-8 text-center text-on-surface-variant">Chưa có khách hàng nào.</td>
                      </tr>
                    ) : (
                      sortedCustomers.map((customer) => (
                        <tr key={customer.id ?? customer._id ?? customer.user_id ?? customer.email} className="hover:bg-surface-container transition-colors group">
                          <td className="px-md py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant shrink-0">
                                {customer.avatar ? (
                                  <img src={customer.avatar} alt={normalizeCustomerName(customer)} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-surface-container text-secondary">{normalizeCustomerName(customer).charAt(0)}</div>
                                )}
                              </div>
                              <div>
                                <p className="font-headline-sm text-body-md text-on-background">{normalizeCustomerName(customer)}</p>
                                <p className="text-label-sm text-secondary">{normalizeCustomerEmail(customer)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-md py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium ${customer.status === 'INACTIVE' ? 'bg-[#fef2f2] text-[#dc2626]' : customer.status === 'ACTIVE' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-surface-variant text-on-surface-variant'}`}>
                              {customer.status === 'ACTIVE' ? 'Active' : customer.status === 'INACTIVE' ? 'Inactive' : customer.status ?? '-'}
                            </span>
                          </td>
                          <td className="px-md py-4 text-body-md">{customer.total_orders ?? customer.order_count ?? customer.orders_count ?? '-'}</td>
                          <td className="px-md py-4 text-body-md font-bold text-primary">{formatMoney(customer.total_spent ?? customer.total_spent_vnd ?? customer.total_spent_value ?? customer.total_spent_amount)}</td>
                          <td className="px-md py-4 text-body-md text-secondary">{lastActiveLabel(customer)}</td>
                          <td className="px-md py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link to={`/admin/customers/${customer.id ?? customer._id ?? customer.user_id}`}>
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

              <div className="p-md bg-surface-bright flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-label-sm text-secondary">
                  Hiển thị {customers.length > 0 ? `${(page - 1) * perPage + 1} - ${Math.min(page * perPage, totalCustomers)}` : '0'} trên {totalCustomers.toLocaleString('vi-VN')} khách hàng
                </p>
                <div className="flex gap-1 flex-wrap">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                    disabled={!canPrev}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <span className="material-symbols-outlined text-body-md">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary text-label-sm font-bold">{page}</button>
                  {pagination && pagination.last_page >= 2 && (
                    <>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container transition-colors text-label-sm"
                        onClick={() => handlePageChange(Math.min(page + 1, pagination.last_page))}
                      >
                        {Math.min(page + 1, pagination.last_page)}
                      </button>
                      {pagination.last_page > page + 1 && (
                        <>
                          <span className="px-2 self-center text-secondary">...</span>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container transition-colors text-label-sm"
                            onClick={() => handlePageChange(pagination.last_page)}
                          >
                            {pagination.last_page}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                    disabled={!canNext}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <span className="material-symbols-outlined text-body-md">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCustomerListPage;
