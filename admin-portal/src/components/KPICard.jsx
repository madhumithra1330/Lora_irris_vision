import React from 'react';

export default function KPICard({ title, value, subStats, icon: Icon, colorClass = 'text-field-primary', glowColor = 'transparent' }) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-field-card border border-field-border p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-350 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-field-text-secondary">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-field-text-primary tracking-tight">{value}</h3>
        </div>
        <div className={`rounded-xl bg-field-bg border border-field-border p-3 ${colorClass} shrink-0`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      {subStats && (
        <div className="mt-4 pt-3 border-t border-field-border flex items-center text-xs font-medium text-field-text-secondary">
          {subStats}
        </div>
      )}
    </div>
  );
}
