import api from './api';

/**
 * Send a pump/valve command to hardware via backend.
 *
 * @param {{ gateway_id: string, node_id?: string, command: 'PUMP_ON'|'PUMP_OFF'|'VALVE_ON'|'VALVE_OFF' }} payload
 */
export async function sendCommand(payload) {
  const finalPayload = {
    gateway_id: payload.gateway_id || payload.gatewayId || 'LIVGW001',
    node_id: payload.node_id || payload.nodeId,
    command: payload.command,
  };
  const { data } = await api.post('/api/commands', finalPayload);
  return data.data;
}

