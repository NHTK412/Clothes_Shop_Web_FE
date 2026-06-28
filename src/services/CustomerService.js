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

  if (Array.isArray(payload?.data?.data)) {
    return { items: payload.data.data, pagination: payload.data.pagination ?? null };
  }

  return { items: [], pagination: null };
};

const CustomerService = {
  async getCustomers(params = {}) {
    try {
      const response = await api.get('/customers', { params });
      return resolvePayload(response);
    } catch (error) {
      const status = error?.response?.status;
      if ([404, 401, 403].includes(status)) {
        // Some backends expose users instead of customers, and role may be stored as ROLE_CUSTOMER
        const retryResponse = await api.get('/users', {
          params: {
            role: 'ROLE_CUSTOMER',
            ...params,
          },
        });

        const payload = resolvePayload(retryResponse);
        if (Array.isArray(payload?.items) && payload.items.length > 0) {
          return payload;
        }

        // Fallback to the more generic role filter if no users were returned
        const fallbackResponse = await api.get('/users', {
          params: {
            role: 'customer',
            ...params,
          },
        });
        return resolvePayload(fallbackResponse);
      }
      throw error;
    }
  },

  async getCustomer(id) {
    if (!id) return null;
    try {
      const response = await api.get(`/customers/${id}`);
      return response?.data ?? response;
    } catch (error) {
      if (error?.response?.status === 404) {
        const retryResponse = await api.get(`/users/${id}`);
        return retryResponse?.data ?? retryResponse;
      }
      throw error;
    }
  },

  async deleteCustomer(id) {
    if (!id) return null;
    return api.delete(`/customers/${id}`);
  },
};

export default CustomerService;
