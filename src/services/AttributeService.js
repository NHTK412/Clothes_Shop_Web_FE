import instance from '../configs/AxiosConfig';

const AttributeService = {
  getAllAttributes: (params = {}) => {
    return instance.get('/attributes', { params });
  },

  getAttributeById: (id) => {
    return instance.get(`/attributes/${id}`);
  },

  async getAttributeValues(idOrName) {
    const response = await instance.get(`/attributes/${idOrName}/values`);
    const values = response?.data ?? response;
    return Array.isArray(values) ? values : [];
  },

  createAttribute: (data) => {
    return instance.post('/attributes', data);
  },

  updateAttribute: (id, data) => {
    return instance.put(`/attributes/${id}`, data);
  },

  deleteAttribute: (id) => {
    return instance.delete(`/attributes/${id}`);
  },

  async getAttributeValue(attributeType, attributeValue) {
    const response = await instance.get(
      `/attributes/${attributeType}/values/${attributeValue}`
    );
    return response?.data ?? response;
  },

  async createAttributeValue(attributeType, data) {
    const response = await instance.post(
      `/attributes/${attributeType}/values`,
      data
    );
    return response?.data ?? response;
  },

  async updateAttributeValue(attributeType, attributeValue, data) {
    const response = await instance.put(
      `/attributes/${attributeType}/values/${attributeValue}`,
      data
    );
    return response?.data ?? response;
  },

  deleteAttributeValue: (attributeType, attributeValue) => {
    return instance.delete(
      `/attributes/${attributeType}/values/${attributeValue}`
    );
  },
};

export default AttributeService;
