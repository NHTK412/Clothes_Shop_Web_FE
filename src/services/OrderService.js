import api from '../configs/AxiosConfig';

const resolvePayload = (response) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return { items: payload, pagination: null };
  }

  if (Array.isArray(payload?.data)) {
    return { items: payload.data, pagination: payload.pagination ?? null };
  }

  if (Array.isArray(payload?.items)) {
    return { items: payload.items, pagination: payload.pagination ?? null };
  }

  if (Array.isArray(payload?.data?.items)) {
    return { items: payload.data.items, pagination: payload.data.pagination ?? null };
  }

  if (Array.isArray(payload?.data?.data)) {
    return { items: payload.data.data, pagination: payload.data.pagination ?? null };
  }

  return { items: [], pagination: null };
};

const OrderService = {
  async getOrders(params = {}) {
    const response = await api.get('/order', { params });
    return resolvePayload(response);
  },

  async getAdminOrders(params = {}) {
    const response = await api.get('/admin/orders', { params });
    return resolvePayload(response);
  },

  async getAdminCustomerOrders(customerId, params = {}) {
    if (!customerId) return { items: [], pagination: null };
    const response = await api.get(`/admin/customers/${customerId}/orders`, { params });
    return resolvePayload(response);
  },

  async getAdminOrder(id) {
    if (!id) return null;
    const response = await api.get(`/admin/orders/${id}`);
    return response?.data ?? response;
  },
  
  async getAdminOrdersSummary(params = {}) {
    const response = await api.get('/admin/orders/summary', { params });
    return response?.data ?? response;
  },
};

export default OrderService;
