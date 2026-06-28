import instance from '../configs/AxiosConfig';

const AttributeService = {
  // Get all attributes
  getAllAttributes: (params = {}) => {
    return instance.get('/attributes', { params });
  },

  // Get attribute by ID
  getAttributeById: (id) => {
    return instance.get(`/attributes/${id}`);
  },

  // Get attribute values by ID or name
  getAttributeValues: (idOrName) => {
    return instance.get(`/attributes/${idOrName}/values`);
  },

  // Create new attribute
  createAttribute: (data) => {
    return instance.post('/attributes', data);
  },

  // Update attribute
  updateAttribute: (id, data) => {
    return instance.put(`/attributes/${id}`, data);
  },

  // Delete attribute
  deleteAttribute: (id) => {
    return instance.delete(`/attributes/${id}`);
  },
};

export default AttributeService;
