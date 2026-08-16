import React, { useEffect } from 'react';
import { useAdminOverview, useFarmers, useGateways, useNodes, useActivity, useAlerts } from '../hooks/useAdminData';
import { useSocketContext } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import KPICard from '../components/KPICard';
import SystemTopology from '../components/SystemTopology';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { 
  Users, 
  Radio, 
  Leaf, 
  Droplets, 
  Play, 
  Activity, 
  Heart, 
  AlertTriangle 
} from 'lucide-react';

export default function OverviewPage() {
  const queryClient = useQueryClient();
  const { subscribe } = useSocketContext();

  // Load queries
  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useAdminOverview();
  const { data: farmers, isLoading: loadingFarmers } = useFarmers();
  const { data: gateways, isLoading: loadingGateways } = useGateways();
  const { data: nodes, isLoading: loadingNodes } = useNodes();
  const { data: activities, refetch: refetchActivity } = useActivity({ limit: 8 });
  const { data: alerts, refetch: refetchAlerts } = useAlerts();

  // Socket updates subscriptions to refresh queries in real-time
  useEffect(() => {
    const unsubGw = subscribe('gateway:update', (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminGateways'] });
      queryClient.invalidateQueries({ queryKey: ['adminGatewayDetail', data.gatewayId] });
      queryClient.invalidateQueries({ queryKey: ['adminDevices'] });
      queryClient.invalidateQueries({ queryKey: ['adminDeviceHealth'] });
      queryClient.invalidateQueries({ queryKey: ['adminWaterAnalytics'] });
    });

    const unsubNode = subscribe('node:update', (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminNodes'] });
      queryClient.invalidateQueries({ queryKey: ['adminNodeDetail', data.nodeId] });
      queryClient.invalidateQueries({ queryKey: ['adminDevices'] });
      queryClient.invalidateQueries({ queryKey: ['adminDeviceHealth'] });
      queryClient.invalidateQueries({ queryKey: ['adminMoistureAnalytics'] });
    });

    const unsubAlert = subscribe('alert:new', () => {
      refetchAlerts();
      refetchOverview();
    });

    const unsubAct = subscribe('activity:new', () => {
      refetchActivity();
    });

    return () => {
      unsubGw();
      unsubNode();
      unsubAlert();
      unsubAct();
    };
  }, [subscribe, queryClient, refetchOverview, refetchAlerts, refetchActivity]);

  if (loadingOverview || loadingFarmers || loadingGateways || loadingNodes) {
    return <LoadingSkeleton type="card" count={4} />;
  }

  if (!overview) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No Overview Data"
        description="Could not load system summary stats from backend."
        onAction={refetchOverview}
      />
    );
  }

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* 2x4 KPI Grid Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Farmers"
          value={overview.farmers?.total || 0}
          subStats={`${overview.farmers?.active || 0} active farmers monitored`}
          icon={Users}
          colorClass="text-field-primary"
        />
        <KPICard
          title="Central Nodes"
          value={overview.gateways?.total || 0}
          subStats={`${overview.gateways?.online || 0} online · ${overview.gateways?.offline || 0} offline`}
          icon={Radio}
          colorClass="text-sky-600"
        />
        <KPICard
          title="Field Nodes"
          value={overview.nodes?.total || 0}
          subStats={`${overview.nodes?.online || 0} online · ${overview.nodes?.offline || 0} offline`}
          icon={Leaf}
          colorClass="text-status-healthy"
        />
        <KPICard
          title="Water Level (Avg)"
          value={`${overview.water?.avgLevel || 0}%`}
          subStats={`${overview.water?.lowWaterCount || 0} low water central nodes`}
          icon={Droplets}
          colorClass="text-status-info"
        />
        <KPICard
          title="Pumps Active"
          value={overview.irrigation?.pumpsOn || 0}
          subStats={`${overview.irrigation?.pumpsOff || 0} pumps stopped`}
          icon={Play}
          colorClass="text-indigo-600"
        />
        <KPICard
          title="Valves Open"
          value={overview.irrigation?.valvesOpen || 0}
          subStats={`${overview.irrigation?.valvesClosed || 0} valves closed`}
          icon={Activity}
          colorClass="text-purple-600"
        />
        <KPICard
          title="Device Health"
          value={`${overview.health?.healthy || 0} Healthy`}
          subStats={`${overview.health?.warning || 0} warn · ${overview.health?.critical || 0} crit · ${overview.health?.offline || 0} offline`}
          icon={Heart}
          colorClass="text-rose-600"
        />
        <KPICard
          title="Active Alerts"
          value={overview.alerts?.total || 0}
          subStats={`${overview.alerts?.critical || 0} critical · ${overview.alerts?.warning || 0} warnings`}
          icon={AlertTriangle}
          colorClass="text-status-warning"
        />
      </div>

      {/* Main Panel Content split in columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column - System Topology and Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Topology Tree */}
          <SystemTopology 
            farmers={farmers}
            gateways={gateways}
            nodes={nodes}
          />

          {/* Recent activities widget */}
          <div className="rounded-2xl border border-field-border bg-field-card p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary">Live Network Activity</h3>
              <p className="text-xs text-field-text-secondary/70 mt-1">Real-time operational events (pumps, valves and connectivity)</p>
            </div>

            <div className="divide-y divide-field-border max-h-96 overflow-y-auto scrollbar-thin space-y-3 mt-4">
              {activities && activities.length === 0 ? (
                <p className="text-sm text-field-text-secondary text-center py-6">No recent operational activity recorded.</p>
              ) : (
                activities && activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-4 pt-3 first:pt-0">
                    <span className="text-xs text-field-text-secondary font-semibold font-display shrink-0 mt-1 w-20">
                      {formatTime(act.created_at)}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-field-text-primary font-bold">{act.message}</p>
                      <div className="flex gap-2 text-[10px] text-field-text-secondary">
                        <span>Farmer: {act.farmer_name}</span>
                        <span>·</span>
                        <span>Gateway: {act.gateway_id}</span>
                        {act.node_id && (
                          <>
                            <span>·</span>
                            <span>Node: {act.node_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 uppercase text-[9px] font-bold px-2 py-0.5 rounded border ${
                      act.type === 'pump' 
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                        : act.type === 'valve' 
                        ? 'bg-purple-55 text-purple-600 border-purple-100' 
                        : 'bg-sky-50 text-sky-600 border-sky-100'
                    }`}>
                      {act.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Active Alerts Summary */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-field-border bg-field-card p-6 shadow-card flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary">Critical Network Alerts</h3>
              <p className="text-xs text-field-text-secondary/70 mt-1">Active alarms demanding operator attention</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin max-h-[600px] mt-4">
              {alerts && alerts.filter(a => !a.resolved).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                  <div className="w-12 h-12 rounded-full border border-field-border bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                    ✔
                  </div>
                  <p className="text-sm font-semibold text-slate-700">All Systems Normal</p>
                  <p className="text-xs text-slate-500 mt-1">Zero unresolved alert states</p>
                </div>
              ) : (
                alerts && alerts.filter(a => !a.resolved).map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`rounded-xl border p-4 flex gap-3 ${
                      alert.severity === 'critical' 
                        ? 'bg-rose-50 border-rose-100 text-status-critical' 
                        : 'bg-amber-50 border-amber-100 text-status-warning'
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {alert.severity === 'critical' ? '🔴' : '🟠'}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-field-text-secondary">
                        {alert.type.replace('_', ' ')}
                      </h4>
                      <p className="text-xs leading-relaxed font-bold">{alert.message}</p>
                      <p className="text-[10px] text-field-text-secondary/70">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
