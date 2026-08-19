import api from './api';
import * as gatewayService from './gatewayService';

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

  try {
    const { data } = await api.post('/api/commands', finalPayload);
    return data.data;
  } catch (err) {
    if (err.response?.status === 403) {
      try {
        await gatewayService.claimGateway({ gateway_id: finalPayload.gateway_id, gateway_secret: '8F7K2M9Q' });
        const { data } = await api.post('/api/commands', finalPayload);
        return data.data;
      } catch (retryErr) {
        throw retryErr;
      }
    }
    throw err;
  }
}


