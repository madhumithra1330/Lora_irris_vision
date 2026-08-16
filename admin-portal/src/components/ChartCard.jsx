import React from 'react';

export default function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-field-border bg-field-card p-6 shadow-card">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary">{title}</h3>
        {subtitle && <p className="text-xs text-field-text-secondary/70 mt-1">{subtitle}</p>}
      </div>
      <div className="h-64 w-full">
        {children}
      </div>
    </div>
  );
}
