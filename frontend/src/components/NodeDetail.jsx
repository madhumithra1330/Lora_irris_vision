import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { sendCommand } from '../services/commandService';
import * as demoService from '../services/demoService';
import { COMMANDS } from '../utils/constants';
import { formatPercentage, formatTemperature, formatHumidity } from '../utils/formatters';

export default function NodeDetail({ node, gatewayId, onCommand }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!node) return null;

  const moisture = node.soilMoisture;
  const moistureStatus = moisture < 30 ? 'critical' : moisture < 60 ? 'warning' : 'ok';
  
  const handleTogglePump = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    
    // LIV001 (GOLD) uses PUMP_ON/OFF for its local relay
    // LIV002 (SILVER) uses VALVE_ON/OFF for ESP-NOW dispatch
    const isGoldNode = node.nodeId === 'LIV001';
    
    let targetCommand;
    if (isGoldNode) {
      targetCommand = node.valveStatus ? COMMANDS.PUMP_OFF : COMMANDS.PUMP_ON;
    } else {
      targetCommand = node.valveStatus ? COMMANDS.VALVE_OFF : COMMANDS.VALVE_ON;
    }

    try {
      if (demoService.isDemoMode()) {
        demoService.toggleValve(node.nodeId, targetCommand);
      } else {
        await sendCommand({
          gateway_id: gatewayId,
          node_id: node.nodeId,
          command: targetCommand,
        });
      }

      // Optimistic update of cache for instant state change
      if (gatewayId) {
        queryClient.setQueryData(['dashboard', gatewayId], (prev) => {
          if (!prev?.data) return prev;
          const updatedNodes = (prev.data.nodes || []).map((n) => {
            if (n.nodeId === node.nodeId) {
              return {
                ...n,
                valveStatus: targetCommand === COMMANDS.PUMP_ON || targetCommand === COMMANDS.VALVE_ON,
                valve_status: targetCommand === COMMANDS.PUMP_ON || targetCommand === COMMANDS.VALVE_ON,
              };
            }
            return n;
          });
          return {
            ...prev,
            data: {
              ...prev.data,
              nodes: updatedNodes,
            },
          };
        });
      }

      setFeedback({ type: 'success', message: `${t('node.pumpRelayStatus')} ${node.valveStatus ? t('status.stopped').toLowerCase() : t('status.running').toLowerCase()} ${t('status.connected').toLowerCase()}` });
      
      if (onCommand) {
        onCommand({
          command: targetCommand,
          target: `Node ${node.nodeId} (${node.cropName || 'Field'})`,
          status: 'executed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || t('errors.failedTogglePump') });
      
      if (onCommand) {
        onCommand({
          command: targetCommand,
          target: `Node ${node.nodeId} (${node.cropName || 'Field'})`,
          status: 'failed',
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [node, gatewayId, onCommand, queryClient, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card space-y-4"
    >
      {/* Node Header info */}
      <div className="flex justify-between items-start border-b border-white/6 pb-3">
        <div>
          <h3 className="text-lg font-bold text-white font-[Outfit]">{node.cropName || 'Field'}</h3>
          <span className="text-[11px] text-white/40 font-mono">{node.nodeId}</span>
        </div>
        <span className={`chip text-xs font-semibold ${node.status === 'online' ? 'chip-success' : 'chip-danger'}`}>
          {node.status === 'online' ? t('status.online') : t('status.offline')}
        </span>
      </div>

      {/* Grid containing Soil Moisture, Temp, Humidity, Battery */}
      <div className="grid grid-cols-2 gap-4">
        {/* Moisture */}
        <div className="bg-surface-700/30 border border-white/4 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{t('node.soilMoisture')}</span>
            <span className="text-lg">💧</span>
          </div>
          <div className={`text-2xl font-black font-[Outfit] ${
            moistureStatus === 'ok' ? 'text-success' : moistureStatus === 'warning' ? 'text-warning' : 'text-danger'
          }`}>
            {formatPercentage(moisture)}
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-surface-700/30 border border-white/4 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{t('node.temperature')}</span>
            <span className="text-lg">☀️</span>
          </div>
          <div className="text-2xl font-black font-[Outfit] text-white">
            {formatTemperature(node.temperature)}
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-surface-700/30 border border-white/4 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{t('node.humidity')}</span>
            <span className="text-lg">☁️</span>
          </div>
          <div className="text-2xl font-black font-[Outfit] text-white">
            {formatHumidity(node.humidity)}
          </div>
        </div>

        {/* Battery */}
        <div className="bg-surface-700/30 border border-white/4 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{t('node.sensorBattery')}</span>
            <span className="text-lg">🔋</span>
          </div>
          <div className={`text-2xl font-black font-[Outfit] ${
            node.battery > 50 ? 'text-success' : node.battery > 20 ? 'text-warning' : 'text-danger'
          }`}>
            {formatPercentage(node.battery)}
          </div>
        </div>
      </div>

      {/* Pump / Relay Control toggle */}
      <div className="pt-3 border-t border-white/6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/60">{t('node.pumpRelayStatus', 'Pump / Relay Status')}:</span>
          <span className={`text-sm font-extrabold uppercase font-[Outfit] ${node.valveStatus ? 'text-success' : 'text-white/40'}`}>
            {node.valveStatus ? t('node.pumpOn', 'ON') : t('node.pumpOff', 'OFF')}
          </span>
        </div>

        <button
          onClick={handleTogglePump}
          disabled={isLoading}
          className={`w-full ${node.valveStatus ? 'btn btn-danger' : 'btn btn-primary'} text-sm min-h-[44px]`}
          aria-label={node.valveStatus ? t('node.stopPump', 'Stop Pump') : t('node.startPump', 'Start Pump')}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('node.sending', 'Sending...')}
            </span>
          ) : (
            node.valveStatus ? t('node.stopPump', 'Stop Pump') : t('node.startPump', 'Start Pump')
          )}
        </button>

        {/* Feedback message */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-center ${
                feedback.type === 'success' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback.type === 'success' ? '✓ ' : '✗ '}{feedback.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

