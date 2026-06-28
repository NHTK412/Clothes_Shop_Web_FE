import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import PageHeader from '../../components/admin/PageHeader';
import MetricsSection from '../../components/admin/MetricsSection';
import ChartsSection from '../../components/admin/ChartsSection';
import OrdersTable from '../../components/admin/OrdersTable';
import DashboardService from '../../services/DashboardService';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')}₫`;
};

const getDaysWindow = (timeRange) => {
  switch (timeRange) {
    case '30days':
      return 30;
    case 'month':
      return 30;
    case 'year':
      return 365;
    case '7days':
    default:
      return 7;
  }
};

const normalizeOrderStatus = (status) => {
  const normalized = `${status ?? ''}`.toLowerCase();
  if (['pending', 'pending_payment', 'chờ xử lý', 'chờ thanh toán'].includes(normalized)) return 'pending';
  if (['processing', 'confirmed', 'shipping', 'đang xử lý', 'đã xác nhận', 'đang giao'].includes(normalized)) return 'processing';
  if (['completed', 'hoàn thành', 'done'].includes(normalized)) return 'completed';
  if (['cancelled', 'canceled', 'cancel', 'đã hủy'].includes(normalized)) return 'cancelled';
  if (['returned', 'return', 'trả hàng'].includes(normalized)) return 'returned';
  return normalized || 'unknown';
};

const AdminDashboardPage = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('7days');
  const [dashboardData, setDashboardData] = useState({ products: [], orders: [], categories: [], customers: [], profile: null, revenue: 0, orderCount: 0, errors: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await DashboardService.getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error('Dashboard data fetch failed', err);
        setError('Không thể tải dữ liệu dashboard. Hiển thị dữ liệu mẫu.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const filteredOrders = useMemo(() => {
    const days = getDaysWindow(timeRange);
    const now = new Date();
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;

    return (dashboardData.orders || []).filter((order) => {
      const createdAt = order?.created_at || order?.createdAt;
      if (!createdAt) return true;
      const orderDate = new Date(createdAt).getTime();
      return !Number.isNaN(orderDate) ? orderDate >= cutoff : true;
    });
  }, [dashboardData.orders, timeRange]);

  const metrics = useMemo(() => {
    const revenue = Number(dashboardData.revenue ?? filteredOrders.reduce((sum, order) => sum + Number(order?.final_price || order?.total_price || 0), 0));
    const orderCount = Number(dashboardData.orderCount ?? filteredOrders.length);
    const inStockProducts = (dashboardData.products || []).filter((product) => {
      const stock = Number(product?.stock ?? product?.available_stock ?? 0);
      const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
      const variantsStock = hasVariants ? product.variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0) : 0;
      return stock > 0 || variantsStock > 0 || product?.in_stock === true;
    }).length;
    const categoryCount = (dashboardData.categories || []).length || (dashboardData.products || []).reduce((acc, product) => {
      const categoryName = product?.category?.name || product?.category || (product?.categories && product.categories[0]?.name) || 'Khác';
      return acc.includes(categoryName) ? acc : [...acc, categoryName];
    }, []).length;

    return [
      {
        icon: 'payments',
        label: 'Tổng doanh thu',
        value: formatCurrency(revenue),
        change: 'Live',
        isPositive: true,
      },
      {
        icon: 'shopping_bag',
        label: 'Tổng đơn hàng',
        value: orderCount.toString(),
        change: 'Live',
        isPositive: true,
      },
      {
        icon: 'inventory_2',
        label: 'Sản phẩm còn hàng',
        value: inStockProducts.toString(),
        change: 'Live',
        isPositive: true,
      },
      {
        icon: 'category',
        label: 'Danh mục',
        value: categoryCount.toString(),
        change: 'Live',
        isPositive: true,
      },
    ];
  }, [dashboardData.categories, dashboardData.products, dashboardData.revenue, dashboardData.orderCount, filteredOrders]);

  const revenueTrend = useMemo(() => {
    const orders = (dashboardData.orders || []).filter((order) => normalizeOrderStatus(order?.status) === 'completed');
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index,
      year: currentYear,
    }));

    const totals = months.map(({ month, year }) => orders.reduce((sum, order) => {
      const createdAt = order?.created_at || order?.createdAt;
      if (!createdAt) return sum;
      const date = new Date(createdAt);
      if (date.getMonth() === month && date.getFullYear() === year) {
        return sum + Number(order?.final_price || order?.total_price || 0);
      }
      return sum;
    }, 0));

    return months.map((monthData) => ({
      label: `T${monthData.month + 1}`,
      total: totals[monthData.month],
    }));
  }, [dashboardData.orders]);

  const categoryData = useMemo(() => {
    const products = dashboardData.products || [];
    const categories = dashboardData.categories || [];

    const countsByCategory = products.reduce((acc, product) => {
      const categoryName =
        typeof product?.category === 'string'
          ? product.category
          : product?.category?.name ?? product?.category?.title ??
            (Array.isArray(product?.categories) && product.categories[0]?.name) ??
            'Danh mục';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {});

    const allCategories = categories.map((category) => {
      const name = category?.name ?? category?.title ?? category?.label ?? 'Danh mục';
      return {
        id: category?.id ?? category?._id ?? name,
        name,
        count: countsByCategory[name] || 1,
      };
    });

    const fallbackCategories = Object.entries(countsByCategory).map(([name, count]) => ({
      id: name,
      name,
      count,
    }));

    return (allCategories.length > 0 ? allCategories : fallbackCategories)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [dashboardData.categories, dashboardData.products]);

  const categoryProductTotal = useMemo(() => {
    const products = dashboardData.products || [];
    return products.reduce((sum, product) => {
      const categoryName =
        typeof product?.category === 'string'
          ? product.category
          : product?.category?.name ?? product?.category?.title ??
            (Array.isArray(product?.categories) && product.categories[0]?.name) ??
            null;
      return categoryName ? sum + 1 : sum;
    }, 0);
  }, [dashboardData.products]);

  return (
    <div className="flex">
      {/* Sidebar */}
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <AdminHeader />

        {/* Main Content Area */}
        <main className="pt-16 min-h-screen bg-surface">
          <div className="max-w-[1280px] mx-auto p-gutter space-y-lg">
            {/* Page Header with Time Range */}
            <PageHeader timeRange={timeRange} setTimeRange={setTimeRange} />

            {error && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-md py-sm text-sm text-yellow-700">
                {error}
              </div>
            )}

            {/* Metrics Cards */}
            <MetricsSection metrics={metrics} isLoading={isLoading} />

            {/* Charts Section */}
            <ChartsSection
              revenueData={revenueTrend}
              categoryData={categoryData}
              categoryTotal={(dashboardData.categories || []).length}
              categoryProductTotal={categoryProductTotal}
            />

            {/* Orders Table */}
            <OrdersTable orders={filteredOrders} isLoading={isLoading} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
