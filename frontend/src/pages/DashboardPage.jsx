import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGateway } from '../context/GatewayContext';
import { useDashboard } from '../hooks/useDashboard';
import { useAlerts } from '../hooks/useAlerts';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { useFarmTimeline } from '../hooks/useFarmTimeline';
import { useSocket } from '../hooks/useSocket';
import { TIMELINE_EVENTS } from '../utils/constants';

import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import WelcomeHeader from '../components/WelcomeHeader';
import FarmOverviewCard from '../components/FarmOverviewCard';
import GatewayOverview from '../components/GatewayOverview';
import NodeDetail from '../components/NodeDetail';
import AIRecommendationCard from '../components/AIRecommendationCard';
import RecentAlerts from '../components/RecentAlerts';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { selectedGateway, hasNone, isLoading: gwLoading } = useGateway();
  const { dashboard, isLoading, isOffline, lastSync } = useDashboard();
  const { alerts, markAlertRead, clearAlerts } = useAlerts(dashboard);
  const { addCommand } = useCommandHistory();
  const { addEvent } = useFarmTimeline();

  // State to track selected field node (defaults to LIV001)
  const [selectedNodeId, setSelectedNodeId] = useState('LIV001');

  const nodes = dashboard?.nodes || [];
  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId) || nodes[0];

  // Auto-select first node if current selection is invalid
  useEffect(() => {
    if (nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // Handle command outputs from pump/valves and save to timeline logs
  const handleCommand = useCallback((cmd) => {
    addCommand(cmd);

    const isValve = cmd.command.startsWith('VALVE_');
    const msgKey = isValve
      ? (cmd.command === 'VALVE_ON' ? 'activity.valveOpenedWithTarget' : 'activity.valveClosedWithTarget')
      : (cmd.command === 'PUMP_ON' ? 'activity.pumpStarted' : 'activity.pumpStopped');
    const params = isValve ? { target: cmd.target } : {};
    const icon = isValve ? '🌱' : '⚡';

    addEvent({
      type: TIMELINE_EVENTS.COMMAND,
      message: msgKey,
      params,
      icon,
    });
  }, [addCommand, addEvent]);

  // Track socket updates to keep timeline updated (for Gateway Connection state only)
  const handleGatewayStatus = useCallback((data) => {
    addEvent({
      type: TIMELINE_EVENTS.GATEWAY_STATUS,
      message: data.status === 'online' ? 'activity.gatewayConnected' : 'activity.gatewayDisconnected',
      icon: '📡',
    });
  }, [addEvent]);

  useSocket('gateway:status', handleGatewayStatus);

  // Track alerts in timeline logs
  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert && !latestAlert.read) {
        addEvent({
          type: TIMELINE_EVENTS.ALERT,
          message: latestAlert.message,
          icon: latestAlert.icon || '⚠️',
          timestamp: latestAlert.timestamp,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length]);

  // Loading state
  if (gwLoading || (isLoading && !dashboard)) {
    return <LoadingState count={4} />;
  }

  // No gateway claimed
  if (hasNone) {
    return (
      <div className="px-4 pt-6 pb-safe">
        <EmptyState
          icon="📡"
          title={t('dashboard.noGatewayTitle')}
          message={t('dashboard.noGatewayDesc')}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-safe space-y-4">
      {/* 1. Welcome Header */}
      <WelcomeHeader isOffline={isOffline} lastSync={lastSync} />

      {/* 2. Farm Overview (simplified) */}
      <FarmOverviewCard dashboard={dashboard} />

      {/* 3. Gateway Metrics */}
      <GatewayOverview
        gatewayMetrics={dashboard?.gateway}
        gateway={dashboard?.gateway}
      />

      {/* 4. Node Monitoring (Selectable Cards + Details) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <span aria-hidden="true">🌱</span> {t('dashboard.fieldNodes')}
        </h2>
        
        {/* Node selector grid */}
        <div className="grid grid-cols-2 gap-3">
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.nodeId;
            return (
              <button
                key={node.nodeId}
                onClick={() => setSelectedNodeId(node.nodeId)}
                className={`card p-4 text-left transition-all duration-300 flex flex-col justify-between border ${
                  isSelected
                    ? 'border-liv-500 bg-surface-800 shadow-[0_0_20px_rgba(22,163,74,0.15)] scale-[1.02]'
                    : 'border-white/6 bg-surface-900/50 hover:bg-surface-800 hover:scale-[1.01]'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex justify-between items-center w-full mb-1">
                  <span className="text-[10px] text-white/40 font-mono tracking-wider">{node.nodeId}</span>
                  <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-success animate-pulse' : 'bg-white/20'}`} />
                </div>
                <div className={`text-sm font-bold font-[Outfit] ${isSelected ? 'text-liv-400' : 'text-white/70'}`}>
                  {node.cropName || t('dashboard.fieldNodes')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Node detailed view */}
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            gatewayId={selectedGateway?.gateway_id}
            onCommand={handleCommand}
          />
        ) : (
          <div className="text-center py-4 text-sm text-white/40">{t('dashboard.noNodes')}</div>
        )}
      </div>



      {/* 6. AI Recommendation */}
      <AIRecommendationCard dashboard={dashboard} />

      {/* 7. Recent Alerts */}
      <RecentAlerts
        alerts={alerts}
        onMarkRead={markAlertRead}
        onClear={clearAlerts}
      />
    </div>
  );
}
