import api from './api';

/**
 * Get dashboard data for a gateway.
 */
export async function getDashboard(gatewayId) {
  const { data } = await api.get(`/api/dashboard/${gatewayId}`);
  return data.data;
}
