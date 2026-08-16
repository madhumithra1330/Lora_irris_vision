import React, { useState, useMemo } from 'react';
import { useAlerts } from '../hooks/useAdminData';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Bell, Filter } from 'lucide-react';

export default function AlertsPage() {
  const { data: alerts, isLoading, refetch } = useAlerts();
  
  // Severity filter state
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('UNRESOLVED');

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter(a => {
      // 1. Severity filter
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      // 2. Status filter
      if (statusFilter === 'UNRESOLVED' && a.resolved) return false;
      if (statusFilter === 'RESOLVED' && !a.resolved) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const columns = [
    { title: 'Severity', key: 'severity', render: (row) => (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
        row.severity === 'critical' 
          ? 'bg-rose-50 text-status-critical border-rose-100' 
          : row.severity === 'warning'
          ? 'bg-amber-50 text-status-warning border-amber-100'
          : 'bg-blue-50 text-status-info border-blue-100'
      }`}>
        {row.severity}
      </span>
    )},
    { title: 'Alert Type', key: 'type', render: (row) => row.type.replace('_', ' ').toUpperCase() },
    { title: 'Alert Message', key: 'message' },
    { title: 'Device ID', key: 'node_id', render: (row) => <span className="font-mono text-slate-800 font-bold">{row.node_id || row.gateway_id}</span> },
    { title: 'Farmer Name', key: 'farmer_name' },
    { title: 'Timestamp', key: 'created_at', render: (row) => new Date(row.created_at).toLocaleString() },
    { title: 'Status', key: 'resolved', render: (row) => (
      row.resolved ? (
        <span className="text-slate-500 font-semibold">Resolved</span>
      ) : (
        <span className="text-status-critical font-bold flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-status-critical" />
          Active
        </span>
      )
    )}
  ];

  if (isLoading) return <LoadingSkeleton type="table" count={1} />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-field-card border border-field-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-field-text-secondary mr-2">
          <Filter size={14} className="text-field-text-secondary" />
          Filter Alerts:
        </div>

        {/* 1. Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-field-border rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-field-primary shadow-sm"
          >
            <option value="ALL">All Alerts</option>
            <option value="UNRESOLVED">Active Alerts Only</option>
            <option value="RESOLVED">Resolved Alerts Only</option>
          </select>
        </div>

        {/* 2. Severity Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Severity</label>
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-field-border rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-field-primary shadow-sm"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Alerts Found"
          description="No alert conditions match the active search filters."
          onAction={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAlerts}
        />
      )}

    </div>
  );
}
