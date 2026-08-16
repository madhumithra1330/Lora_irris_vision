import React from 'react';

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="h-10 w-10 bg-slate-800 rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-slate-800 rounded" />
      <div className="h-3 w-32 bg-slate-800 rounded pt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-4 w-12 bg-slate-800 rounded" />
            <div className="h-4 flex-1 bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  return (
    <div className={type === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'space-y-6'}>
      {Array.from({ length: count }).map((_, i) => (
        type === 'card' ? <CardSkeleton key={i} /> : <TableSkeleton key={i} />
      ))}
    </div>
  );
}
