import api from './api';

/**
 * Get all gateways owned by the current farmer.
 */
export async function getMyGateways() {
  const { data } = await api.get('/api/gateways/my');
  return data.data; // array of gateways
}

/**
 * Claim a gateway using ID and secret.
 */
export async function claimGateway({ gateway_id, gateway_secret }) {
  const { data } = await api.post('/api/gateways/claim', {
    gateway_id,
    gateway_secret,
  });
  return data.data;
}

/**
 * Get nodes for a gateway.
 */
export async function getNodesByGateway(gatewayId) {
  const { data } = await api.get(`/api/gateways/${gatewayId}/nodes`);
  return data.data;
}

/**
 * Get sensor history for a node.
 */
export async function getNodeHistory(nodeId, params = {}) {
  const { data } = await api.get(`/api/node/${nodeId}/history`, { params });
  return data.data;
}

/**
 * Update node crop name.
 */
export async function updateNode(nodeId, updateData) {
  const { data } = await api.patch(`/api/nodes/${nodeId}`, updateData);
  return data.data;
}
