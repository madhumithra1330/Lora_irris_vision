import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { sendCommand } from '../services/commandService';
import * as demoService from '../services/demoService';
import { COMMANDS } from '../utils/constants';

export default function PumpControl({ gatewayId, pumpStatus, onCommand }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isPumpRunning = pumpStatus === true || pumpStatus === 'on';

  const handleToggle = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    const targetCommand = isPumpRunning ? COMMANDS.PUMP_OFF : COMMANDS.PUMP_ON;

    try {
      if (demoService.isDemoMode()) {
        demoService.togglePump(targetCommand);
      } else {
        await sendCommand({
          gateway_id: gatewayId,
          command: targetCommand,
        });
      }

      // Optimistic update of cache for instant state change
      if (gatewayId) {
        queryClient.setQueryData(['dashboard', gatewayId], (prev) => {
          if (!prev?.data) return prev;
          return {
            ...prev,
            data: {
              ...prev.data,
              gateway: {
                ...prev.data.gateway,
                pumpStatus: targetCommand === COMMANDS.PUMP_ON,
              },
            },
          };
        });
      }

      setFeedback({ type: 'success', message: `${t('pump.pumpControl')} ${isPumpRunning ? t('status.stopped').toLowerCase() : t('status.running').toLowerCase()} ${t('status.connected').toLowerCase()}` });
      
      if (onCommand) {
        onCommand({
          command: targetCommand,
          target: 'Gateway',
          status: 'executed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || t('errors.failedTogglePump') });
      
      if (onCommand) {
        onCommand({
          command: targetCommand,
          target: 'Gateway',
          status: 'failed',
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [isPumpRunning, gatewayId, onCommand, queryClient, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card space-y-4"
      role="region"
      aria-label={t('pump.pumpControl')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">⚡</span>
          <h2 className="text-sm font-semibold text-white">{t('pump.pumpControl')}</h2>
        </div>
        {/* Status indicator light */}
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <span className={`w-2 h-2 rounded-full ${isPumpRunning ? 'bg-success animate-pulse' : 'bg-white/20'}`} />
          <span>{isPumpRunning ? t('status.running') : t('status.stopped')}</span>
        </div>
      </div>

      {/* Main status display */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
          isPumpRunning ? 'bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'bg-surface-600'
        } transition-all duration-300`}>
          {isPumpRunning ? '💧' : '⏸️'}
        </div>
        <div>
          <div className={`text-md font-bold font-[Outfit] ${isPumpRunning ? 'text-success' : 'text-white/50'}`}>
            {isPumpRunning ? t('pump.pumpRunning') : t('pump.pumpStopped')}
          </div>
          <div className="text-[10px] text-white/40">
            {isPumpRunning ? t('pump.waterDistributing') : t('pump.readyStartIrrigation')}
          </div>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`w-full ${isPumpRunning ? 'btn btn-danger' : 'btn btn-primary'} text-sm min-h-[44px]`}
        aria-label={isPumpRunning ? t('pump.stopPump') : t('pump.startPump')}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isPumpRunning ? t('pump.stoppingPump') : t('pump.startingPump')}
          </span>
        ) : (
          isPumpRunning ? t('pump.stopPump') : t('pump.startPump')
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
    </motion.div>
  );
}

