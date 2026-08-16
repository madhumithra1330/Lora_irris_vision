import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, CloudOff, Info } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normStatus = (status || '').toLowerCase();
  
  let bg = 'bg-slate-100 text-status-offline border-slate-200';
  let label = status;
  let Icon = CloudOff;

  if (normStatus === 'online' || normStatus === 'healthy' || normStatus === 'active') {
    bg = 'bg-emerald-50 text-status-healthy border-emerald-100';
    label = normStatus === 'online' ? 'Online' : normStatus === 'active' ? 'Active' : 'Healthy';
    Icon = CheckCircle2;
  } else if (normStatus === 'offline' || normStatus === 'critical' || normStatus === 'inactive') {
    bg = 'bg-rose-50 text-status-critical border-rose-100';
    label = normStatus === 'offline' ? 'Offline' : normStatus === 'inactive' ? 'Inactive' : 'Critical';
    Icon = normStatus === 'offline' ? CloudOff : AlertCircle;
  } else if (normStatus === 'warning' || normStatus === 'degraded') {
    bg = 'bg-amber-50 text-status-warning border-amber-100';
    label = normStatus === 'warning' ? 'Warning' : 'Degraded';
    Icon = AlertTriangle;
  } else if (normStatus === 'info' || normStatus === 'sent' || normStatus === 'acknowledged') {
    bg = 'bg-blue-50 text-status-info border-blue-100';
    label = normStatus === 'acknowledged' ? 'Acknowledged' : normStatus === 'sent' ? 'Sent' : 'Info';
    Icon = Info;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}>
      <Icon size={12} className="shrink-0" />
      {label}
    </span>
  );
}
