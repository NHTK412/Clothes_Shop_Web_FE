import api from '../configs/AxiosConfig';
import CustomerService from './CustomerService';
import OrderService from './OrderService';
import ProductsService from './ProductsService';

const normalizePayloadItems = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const DashboardService = {
  async getDashboardData() {
    const [ordersResult, summaryResult, productsResult, categoriesResult, customersResult, profileResult] = await Promise.allSettled([
      OrderService.getAdminOrders({ per_page: 100, page: 1 }),
      OrderService.getAdminOrdersSummary({ status: 'COMPLETED' }),
      ProductsService.getProducts({ per_page: 100, page: 1 }),
      ProductsService.getCategories({ per_page: 100, page: 1 }),
      CustomerService.getCustomers({ per_page: 100, page: 1 }),
      api.get('/profile'),
    ]);

    const orders = ordersResult.status === 'fulfilled' ? normalizePayloadItems(ordersResult.value?.items ?? ordersResult.value) : [];
    const products = productsResult.status === 'fulfilled' ? normalizePayloadItems(productsResult.value?.items ?? productsResult.value) : [];
    const categories = categoriesResult.status === 'fulfilled' ? normalizePayloadItems(categoriesResult.value) : [];
    const customers = customersResult.status === 'fulfilled' ? normalizePayloadItems(customersResult.value?.items ?? customersResult.value) : [];

    const summaryData = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
    const revenue = Number(summaryData?.data?.total_revenue ?? summaryData?.total_revenue ?? summaryData?.total ?? 0) || 0;
    const orderCount = Number(summaryData?.data?.total_orders ?? summaryData?.total_orders ?? summaryData?.orders ?? orders.length) || orders.length;

    const profile = profileResult.status === 'fulfilled' ? profileResult.value?.data ?? profileResult.value : null;

    return {
      products,
      orders,
      categories,
      customers,
      revenue,
      orderCount,
      profile,
      errors: [
        ordersResult.status === 'rejected' ? 'orders' : null,
        summaryResult.status === 'rejected' ? 'order_summary' : null,
        productsResult.status === 'rejected' ? 'products' : null,
        categoriesResult.status === 'rejected' ? 'categories' : null,
        customersResult.status === 'rejected' ? 'customers' : null,
        profileResult.status === 'rejected' ? 'profile' : null,
      ].filter(Boolean),
    };
  },
};

export default DashboardService;
