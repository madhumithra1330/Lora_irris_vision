import React, { useState } from 'react';
import { useFarmers, useFarmerDetail } from '../hooks/useAdminData';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Users, Phone, Mail, Calendar, Radio, Leaf, Clock } from 'lucide-react';

export default function FarmersPage() {
  const { data: farmers, isLoading, refetch } = useFarmers();
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load details for selected farmer
  const { data: detailData, isLoading: loadingDetail } = useFarmerDetail(selectedFarmerId);

  const columns = [
    { title: 'Farmer Name', key: 'name', sortable: true },
    { title: 'Phone Number', key: 'phone' },
    { title: 'Email Address', key: 'email', render: (row) => row.email || '--' },
    { title: 'Central Nodes', key: 'gatewayCount', sortable: true, render: (row) => `${row.gatewayCount} Gateways` },
    { title: 'Field Nodes', key: 'nodeCount', sortable: true, render: (row) => `${row.nodeCount} Sensors` },
    { title: 'Online Devices', key: 'onlineDeviceCount', render: (row) => <span className="text-status-healthy font-semibold">{row.onlineDeviceCount}</span> },
    { title: 'Offline Devices', key: 'offlineDeviceCount', render: (row) => <span className="text-status-critical font-semibold">{row.offlineDeviceCount}</span> },
    { title: 'Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> }
  ];

  const handleRowClick = (row) => {
    setSelectedFarmerId(row.id);
    setIsDrawerOpen(true);
  };

  if (isLoading) return <LoadingSkeleton type="table" count={1} />;
  if (!farmers || farmers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Farmers Available"
        description="There are currently no registered farmers on the system."
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <DataTable
        columns={columns}
        data={farmers}
        searchField="name"
        searchPlaceholder="Search farmers by name..."
        onRowClick={handleRowClick}
      />

      {/* Details Drawer */}
      <DetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={detailData ? `Farmer: ${detailData.farmer?.name}` : 'Loading details...'}
      >
        {loadingDetail ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 rounded" />
            <div className="h-4 w-2/3 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded-xl" />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            
            {/* 1. Farmer Profile Info */}
            <div className="rounded-xl border border-field-border bg-field-bg p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary mb-1">Farmer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-field-text-primary font-medium">
                  <Phone size={14} className="text-field-text-secondary" />
                  <span>{detailData.farmer?.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-field-text-primary font-medium">
                  <Mail size={14} className="text-field-text-secondary" />
                  <span>{detailData.farmer?.email || '--'}</span>
                </div>
                <div className="flex items-center gap-2 text-field-text-primary font-medium sm:col-span-2">
                  <Calendar size={14} className="text-field-text-secondary" />
                  <span>Registered: {new Date(detailData.farmer?.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* 2. Central Nodes Owned */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <Radio size={14} className="text-sky-600" />
                Central Nodes ({detailData.gateways?.length || 0})
              </h3>
              <div className="space-y-2">
                {detailData.gateways?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic">No central gateways owned.</p>
                ) : (
                  detailData.gateways?.map(gw => (
                    <div key={gw.id} className="rounded-xl border border-field-border bg-white p-4 flex justify-between items-center text-xs hover:bg-field-hover transition shadow-sm">
                      <div>
                        <p className="font-bold text-field-text-primary font-display">{gw.id}</p>
                        <p className="text-field-text-secondary text-[10px] mt-0.5">{gw.name}</p>
                        <p className="text-[10px] font-medium text-field-text-secondary mt-2">💧 Tank: {gw.water_level}% · 🔋 Battery: {gw.battery}%</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${gw.pump_status ? 'bg-indigo-50 text-indigo-650 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                          Pump: {gw.pump_status ? 'ON' : 'OFF'}
                        </span>
                        <StatusBadge status={gw.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Field Nodes Owned */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <Leaf size={14} className="text-field-primary" />
                Field Nodes ({detailData.nodes?.length || 0})
              </h3>
              <div className="space-y-2">
                {detailData.nodes?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic">No field sensors connected.</p>
                ) : (
                  detailData.nodes?.map(nd => (
                    <div key={nd.id} className="rounded-xl border border-field-border bg-white p-4 flex justify-between items-center text-xs hover:bg-field-hover transition shadow-sm">
                      <div>
                        <p className="font-bold text-field-text-primary font-display">{nd.id}</p>
                        <p className="text-field-text-secondary text-[10px] mt-0.5">{nd.crop_name}</p>
                        <p className="text-[10px] font-medium text-field-text-secondary mt-2">💧 Moisture: {nd.soil_moisture}% · 🌡️ Temp: {nd.temperature}°C</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${nd.valve_status ? 'bg-purple-50 text-purple-650 border border-purple-100' : 'bg-slate-100 text-slate-500'}`}>
                          Valve: {nd.valve_status ? 'OPEN' : 'CLOSED'}
                        </span>
                        <StatusBadge status={nd.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Recent Activity Log */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary flex items-center gap-2">
                <Clock size={14} className="text-field-text-secondary" />
                Recent Operational Activity
              </h3>
              <div className="divide-y divide-field-border border border-field-border rounded-xl bg-white p-4 max-h-60 overflow-y-auto scrollbar-thin shadow-sm">
                {detailData.activity?.length === 0 ? (
                  <p className="text-xs text-field-text-secondary italic text-center py-4">No recent activity logged.</p>
                ) : (
                  detailData.activity?.map((act) => (
                    <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <p className="text-field-text-primary font-medium">{act.message}</p>
                      <p className="text-[9px] text-field-text-secondary mt-1">{new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-xs text-field-text-secondary">Failed to load farmer details.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
