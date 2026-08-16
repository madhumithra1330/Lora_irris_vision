import React, { useState, useMemo } from 'react';
import { useActivity, useFarmers, useGateways } from '../hooks/useAdminData';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Activity, Filter } from 'lucide-react';

export default function ActivityPage() {
  // Query Filters
  const [eventType, setEventType] = useState('ALL');
  const [selectedFarmer, setSelectedFarmer] = useState('ALL');
  const [selectedGateway, setSelectedGateway] = useState('ALL');

  // Load auxiliary lists for filters dropdown
  const { data: farmers } = useFarmers();
  const { data: gateways } = useGateways();

  // Create query filter payload
  const queryFilters = useMemo(() => {
    const payload = {};
    if (eventType !== 'ALL') {
      if (eventType === 'PUMP') payload.type = 'pump';
      else if (eventType === 'VALVE') payload.type = 'valve';
      else if (eventType === 'CONNECTIVITY') payload.type = 'connectivity';
    }
    if (selectedFarmer !== 'ALL') payload.farmer_id = selectedFarmer;
    if (selectedGateway !== 'ALL') payload.gateway_id = selectedGateway;
    return payload;
  }, [eventType, selectedFarmer, selectedGateway]);

  // Load activities list
  const { data: activities, isLoading, refetch } = useActivity(queryFilters);

  const columns = [
    { title: 'Timestamp', key: 'created_at', render: (row) => new Date(row.created_at).toLocaleString() },
    { title: 'Event Type', key: 'type', render: (row) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
        row.type === 'pump' 
          ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
          : row.type === 'valve' 
          ? 'bg-purple-55 text-purple-600 border-purple-100' 
          : 'bg-sky-50 text-sky-600 border-sky-100'
      }`}>
        {row.type.toUpperCase()}
      </span>
    )},
    { title: 'Operational Action / Event Message', key: 'message' },
    { title: 'Device ID', key: 'gateway_id', render: (row) => <span className="font-mono text-slate-800 font-bold">{row.node_id || row.gateway_id}</span> },
    { title: 'Assigned Farmer', key: 'farmer_name' },
    { title: 'Central Node', key: 'gateway_name' },
    { title: 'Field Node', key: 'node_name', render: (row) => row.node_name || '--' }
  ];

  if (isLoading) return <LoadingSkeleton type="table" count={1} />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Dropdown Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-field-card border border-field-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-field-text-secondary mr-2">
          <Filter size={14} className="text-field-text-secondary" />
          Filter Logs:
        </div>

        {/* 1. Event Type */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Event Type</label>
          <select 
            value={eventType} 
            onChange={(e) => setEventType(e.target.value)}
            className="bg-white border border-field-border rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-field-primary shadow-sm"
          >
            <option value="ALL">All Actions</option>
            <option value="PUMP">Pump Events</option>
            <option value="VALVE">Valve Events</option>
            <option value="CONNECTIVITY">Connectivity Events</option>
          </select>
        </div>

        {/* 2. Farmer */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Farmer</label>
          <select 
            value={selectedFarmer} 
            onChange={(e) => setSelectedFarmer(e.target.value)}
            className="bg-white border border-field-border rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-field-primary shadow-sm max-w-[150px]"
          >
            <option value="ALL">All Farmers</option>
            {farmers && farmers.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Gateway */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Central Node</label>
          <select 
            value={selectedGateway} 
            onChange={(e) => setSelectedGateway(e.target.value)}
            className="bg-white border border-field-border rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-field-primary shadow-sm max-w-[150px]"
          >
            <option value="ALL">All Gateways</option>
            {gateways && gateways.map(g => (
              <option key={g.id} value={g.id}>{g.id}</option>
            ))}
          </select>
        </div>
      </div>

      {activities && activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Logs Recorded"
          description="There are no operational events matching the selected filters."
        />
      ) : (
        <DataTable
          columns={columns}
          data={activities}
        />
      )}

    </div>
  );
}
