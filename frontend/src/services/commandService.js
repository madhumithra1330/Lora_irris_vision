import api from './api';

/**
 * Send a pump/valve command.
 *
 * @param {{ gateway_id: string, node_id?: string, command: 'PUMP_ON'|'PUMP_OFF'|'VALVE_ON'|'VALVE_OFF' }} payload
 */
export async function sendCommand(payload) {
  const { data } = await api.post('/api/commands', payload);
  return data.data;
}
