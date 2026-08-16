import React, { useState, useMemo } from 'react';
import { useGateways, useGatewayDetail } from '../hooks/useAdminData';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Radio, Users, Droplets, Battery, MapPin, Compass, List, Activity, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function CentralNodesPage() {
  const { data: gateways, isLoading, refetch } = useGateways();
  const [selectedGwId, setSelectedGwId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // Load details
  const { data: detailData, isLoading: loadingDetail } = useGatewayDetail(selectedGwId);

  // Filter logic
  const filteredGateways = useMemo(() => {
    if (!gateways) return [];
    return gateways.filter(g => {
      if (filter === 'ALL') return true;
      if (filter === 'ONLINE') return g.status === 'online';
      if (filter === 'OFFLINE') return g.status === 'offline';
      if (filter === 'LOW_BATTERY') return g.battery < 25;
      if (filter === 'LOW_WATER') return g.water_level < 20;
      if (filter === 'PUMP_RUNNING') return g.pump_status === true;
      return true;
    });
  }, [gateways, filter]);

  const columns = [
    { title: 'Central Node ID', key: 'id', sortable: true, render: (row) => <span className="font-semibold font-display text-slate-800">{row.id}</span> },
    { title: 'Assigned Farmer', key: 'farmer_name', sortable: true },
    { title: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { title: 'Pump Status', key: 'pump_status', render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.pump_status ? 'bg-indigo-50 text-indigo-650 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
          {row.pump_status ? 'RUNNING' : 'STOPPED'}
        </span>
    )},
    { title: 'Water Tank Level', key: 'water_level', sortable: true, render: (row) => (
      <span className={row.water_level < 20 ? 'text-status-critical font-bold' : 'text-slate-700'}>
        {row.water_level}%
      </span>
    )},
    { title: 'Battery', key: 'battery', sortable: true, render: (row) => (
      <span className={row.battery < 20 ? 'text-status-critical font-bold' : 'text-slate-700'}>
        {row.battery}%
      </span>
    )},
    { title: 'Connected Nodes', key: 'node_count', sortable: true, render: (row) => `${row.online_nodes}/${row.node_count} Active` },
    { title: 'Health Score', key: 'health_score', sortable: true, render: (row) => (
      <span className={`font-semibold ${row.health_score > 70 ? 'text-status-healthy' : row.health_score > 40 ? 'text-status-warning' : 'text-status-critical'}`}>
        {row.health_score}/100
      </span>
    )},
    { title: 'Last Seen', key: 'last_seen', render: (row) => new Date(row.last_seen).toLocaleTimeString() }
  ];

  const handleRowClick = (row) => {
    setSelectedGwId(row.id);
    setIsDrawerOpen(true);
  };

  if (isLoading) return <LoadingSkeleton type="table" count={1} />;
  if (!gateways || gateways.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No Central Nodes Available"
        description="Could not find any gateways linked to this network."
        onAction={refetch}
      />
    );
  }

  const filterOptions = [
    { key: 'ALL', label: 'All Gateways' },
    { key: 'ONLINE', label: 'Online' },
    { key: 'OFFLINE', label: 'Offline' },
    { key: 'LOW_BATTERY', label: 'Low Battery' },
    { key: 'LOW_WATER', label: 'Low Water' },
    { key: 'PUMP_RUNNING', label: 'Pump Running' }
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filters Pill Row */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === opt.key 
                ? 'bg-field-primary text-white border-field-primary' 
                : 'bg-white text-field-text-secondary border-field-border hover:bg-field-hover hover:text-field-text-primary shadow-sm'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredGateways}
        searchField="id"
        searchPlaceholder="Search by Central Node ID..."
        onRowClick={handleRowClick}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={detailData ? `Central Node: ${detailData.gateway?.id}` : 'Loading Node info...'}
      >
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-48 bg-slate-200 rounded-xl" />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            
            {/* 1. Gateway metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Droplets size={12} className="text-status-info" />
                  Water Tank level
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.gateway?.water_level}%</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${detailData.gateway?.water_level < 20 ? 'bg-status-critical' : 'bg-status-info'}`}
                    style={{ width: `${detailData.gateway?.water_level}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Battery size={12} className="text-status-healthy" />
                  Gateway Battery
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.gateway?.battery}%</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${detailData.gateway?.battery < 20 ? 'bg-status-critical' : 'bg-status-healthy'}`}
                    style={{ width: `${detailData.gateway?.battery}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Water history trend */}
            {detailData.history && detailData.history.length > 0 && (
              <div className="rounded-xl border border-field-border bg-white p-4 space-y-3 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-status-info" />
                  Water Level Trend (Recent)
                </span>
                <div className="h-40 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={detailData.history.reverse()}>
                      <defs>
                        <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563A6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563A6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-field-border)" />
                      <XAxis 
                        dataKey="recorded_at" 
                        tickFormatter={(str) => new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="#5F6D64" 
                        fontSize={9}
                      />
                      <YAxis stroke="#5F6D64" fontSize={9} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#DDE5DF', borderRadius: '8px' }}
                        labelStyle={{ fontSize: '10px', color: '#5F6D64' }}
                        itemStyle={{ fontSize: '11px', color: '#17211B' }}
                        formatter={(val) => [`${val}%`, 'Water Level']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="water_level" stroke="#2563A6" strokeWidth={2} fillOpacity={1} fill="url(#colorWater)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. Details grid */}
            <div className="rounded-xl border border-field-border bg-field-bg p-4 space-y-3 text-xs">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-field-text-secondary">System Specifications</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <div className="space-y-0.5">
                  <p className="text-field-text-secondary text-[10px]">Assigned Farmer</p>
                  <p className="text-field-text-primary font-bold flex items-center gap-1">
                    <Users size={12} className="text-field-text-secondary" />
                    {detailData.gateway?.farmer_name}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-field-text-secondary text-[10px]">Firmware Version</p>
                  <p className="text-field-text-primary font-bold">{detailData.gateway?.firmware}</p>
                </div>
                {detailData.gateway?.location && (
                  <div className="col-span-2 space-y-1 pt-1">
                    <p className="text-field-text-secondary text-[10px]">Physical GPS Location</p>
                    <p className="text-field-text-primary font-bold flex items-center gap-1.5">
                      <MapPin size={12} className="text-status-critical" />
                      <span>{detailData.gateway.location.address}</span>
                      <span className="text-field-text-secondary">({detailData.gateway.location.lat}, {detailData.gateway.location.lng})</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Connected Field Nodes */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <List size={14} className="text-slate-500" />
                Connected Field Nodes ({detailData.nodes?.length || 0})
              </h3>
              <div className="space-y-2">
                {detailData.nodes?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic">No nodes configured under this gateway.</p>
                ) : (
                  detailData.nodes?.map(node => (
                    <div key={node.id} className="rounded-xl border border-field-border bg-white p-4 flex justify-between items-center text-xs hover:bg-field-hover transition shadow-sm">
                      <div>
                        <p className="font-bold text-field-text-primary font-display">{node.id}</p>
                        <p className="text-field-text-secondary text-[10px] mt-0.5">{node.crop_name}</p>
                        <p className="text-[10px] font-medium text-field-text-secondary mt-2">💧 Moisture: {node.soil_moisture}% · 🌡️ Temp: {node.temperature}°C</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${node.valve_status ? 'bg-purple-50 text-purple-650 border border-purple-100' : 'bg-slate-100 text-slate-500'}`}>
                          Valve: {node.valve_status ? 'OPEN' : 'CLOSED'}
                        </span>
                        <StatusBadge status={node.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Activities */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <Activity size={14} className="text-field-primary" />
                Gateway Activity History
              </h3>
              <div className="divide-y divide-field-border border border-field-border rounded-xl bg-white p-4 max-h-48 overflow-y-auto scrollbar-thin shadow-sm">
                {detailData.activity?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic text-center py-4">No recent activities on this gateway.</p>
                ) : (
                  detailData.activity?.map((act) => (
                    <div key={act.id} className="py-2 first:pt-0 last:pb-0 text-xs">
                      <p className="text-field-text-primary">{act.message}</p>
                      <p className="text-[9px] text-field-text-secondary mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-xs text-field-text-secondary">Failed to load gateway details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
