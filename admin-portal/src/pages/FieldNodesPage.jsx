import React, { useState, useMemo } from 'react';
import { useNodes, useNodeDetail } from '../hooks/useAdminData';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Leaf, Users, Radio, Thermometer, Droplet, Sun, Battery, Activity, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function FieldNodesPage() {
  const { data: nodes, isLoading, refetch } = useNodes();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // Load details
  const { data: detailData, isLoading: loadingDetail } = useNodeDetail(selectedNodeId);

  // Filters logic
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter(n => {
      if (filter === 'ALL') return true;
      if (filter === 'ONLINE') return n.status === 'online';
      if (filter === 'OFFLINE') return n.status === 'offline';
      if (filter === 'LOW_BATTERY') return n.battery < 25;
      if (filter === 'LOW_MOISTURE') return n.soil_moisture < 30;
      if (filter === 'VALVE_OPEN') return n.valve_status === true;
      if (filter === 'VALVE_CLOSED') return n.valve_status === false;
      return true;
    });
  }, [nodes, filter]);

  const columns = [
    { title: 'Field Node ID', key: 'id', sortable: true, render: (row) => <span className="font-semibold font-display text-slate-800">{row.id}</span> },
    { title: 'Crop / Section', key: 'crop_name', sortable: true },
    { title: 'Assigned Farmer', key: 'farmer_name', sortable: true },
    { title: 'Parent Gateway', key: 'gateway_id', sortable: true, render: (row) => <span className="font-mono text-slate-500 font-semibold">{row.gateway_id}</span> },
    { title: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { title: 'Soil Moisture', key: 'soil_moisture', sortable: true, render: (row) => (
      <span className={`font-semibold ${row.soil_moisture < 30 ? 'text-status-critical' : 'text-slate-700'}`}>
        {row.soil_moisture}%
      </span>
    )},
    { title: 'Temperature', key: 'temperature', sortable: true, render: (row) => `${row.temperature}°C` },
    { title: 'Humidity', key: 'humidity', sortable: true, render: (row) => `${row.humidity}%` },
    { title: 'Battery', key: 'battery', sortable: true, render: (row) => (
      <span className={row.battery < 20 ? 'text-status-critical font-bold' : 'text-slate-700'}>
        {row.battery}%
      </span>
    )},
    { title: 'Valve Status', key: 'valve_status', render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.valve_status ? 'bg-purple-50 text-purple-650 border border-purple-100' : 'bg-slate-100 text-slate-500'}`}>
          {row.valve_status ? 'OPEN' : 'CLOSED'}
        </span>
    )},
    { title: 'Health Score', key: 'health_score', sortable: true, render: (row) => (
      <span className={`font-semibold ${row.health_score > 70 ? 'text-status-healthy' : row.health_score > 40 ? 'text-status-warning' : 'text-status-critical'}`}>
        {row.health_score}/100
      </span>
    )}
  ];

  const handleRowClick = (row) => {
    setSelectedNodeId(row.id);
    setIsDrawerOpen(true);
  };

  if (isLoading) return <LoadingSkeleton type="table" count={1} />;
  if (!nodes || nodes.length === 0) {
    return (
      <EmptyState
        icon={Leaf}
        title="No Field Nodes Connected"
        description="There are currently no sensor nodes logged in the database."
        onAction={refetch}
      />
    );
  }

  const filterOptions = [
    { key: 'ALL', label: 'All Sensors' },
    { key: 'ONLINE', label: 'Online' },
    { key: 'OFFLINE', label: 'Offline' },
    { key: 'LOW_BATTERY', label: 'Low Battery' },
    { key: 'LOW_MOISTURE', label: 'Low Moisture' },
    { key: 'VALVE_OPEN', label: 'Valve Open' },
    { key: 'VALVE_CLOSED', label: 'Valve Closed' }
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filter Options Pill Row */}
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
        data={filteredNodes}
        searchField="id"
        searchPlaceholder="Search by Field Node ID..."
        onRowClick={handleRowClick}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={detailData ? `Sensor Node: ${detailData.node?.id}` : 'Loading Sensor details...'}
      >
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-48 bg-slate-200 rounded-xl" />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            
            {/* 1. Sensor value 2x2 grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Droplet size={12} className="text-field-primary" />
                  Soil Moisture
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.node?.soil_moisture}%</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-field-primary"
                    style={{ width: `${detailData.node?.soil_moisture}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Thermometer size={12} className="text-status-warning" />
                  Air Temperature
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.node?.temperature}°C</p>
              </div>

              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sun size={12} className="text-teal-600" />
                  Air Humidity
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.node?.humidity}%</p>
              </div>

              <div className="rounded-xl border border-field-border bg-white p-4 space-y-1 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Battery size={12} className="text-field-text-secondary" />
                  Sensor Battery
                </span>
                <p className="text-xl font-bold font-display text-field-text-primary">{detailData.node?.battery}%</p>
              </div>
            </div>

            {/* 2. Moisture history chart */}
            {detailData.history && detailData.history.length > 0 && (
              <div className="rounded-xl border border-field-border bg-white p-4 space-y-3 shadow-sm">
                <span className="text-[10px] text-field-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-field-primary" />
                  Moisture Trend (Last 24 Hours)
                </span>
                <div className="h-40 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={detailData.history.reverse()}>
                      <defs>
                        <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#237A4B" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#237A4B" stopOpacity={0}/>
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
                        formatter={(val) => [`${val}%`, 'Soil Moisture']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="soil_moisture" stroke="#237A4B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMoisture)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. Specs */}
            <div className="rounded-xl border border-field-border bg-field-bg p-4 space-y-3 text-xs">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-field-text-secondary">Specifications</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <div className="space-y-0.5">
                  <p className="text-field-text-secondary text-[10px]">Assigned Farmer</p>
                  <p className="text-field-text-primary font-bold flex items-center gap-1">
                    <Users size={12} className="text-field-text-secondary" />
                    {detailData.node?.farmer_name}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-field-text-secondary text-[10px]">Parent Gateway</p>
                  <p className="text-field-text-primary font-bold font-mono flex items-center gap-1">
                    <Radio size={12} className="text-sky-600" />
                    {detailData.node?.gateway_id}
                  </p>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <p className="text-field-text-secondary text-[10px]">Crop Group</p>
                  <p className="text-field-text-primary font-bold">{detailData.node?.crop_name}</p>
                </div>
              </div>
            </div>

            {/* 4. Valve activity history */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <Activity size={14} className="text-purple-650" />
                Valve Control Activity
              </h3>
              <div className="divide-y divide-field-border border border-field-border rounded-xl bg-white p-4 max-h-48 overflow-y-auto scrollbar-thin shadow-sm">
                {detailData.activity?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic text-center py-4">No recent activity logged for this valve.</p>
                ) : (
                  detailData.activity?.map((act) => (
                    <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <p className="text-field-text-primary">{act.message}</p>
                      <p className="text-[9px] text-field-text-secondary mt-1">{new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-xs text-field-text-secondary">Failed to load sensor details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
