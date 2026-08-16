import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/5 rounded-2xl bg-slate-900/10">
      {Icon && (
        <div className="rounded-full bg-slate-800/80 p-4 border border-white/5 text-slate-400 mb-4">
          <Icon size={32} />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-300 font-display mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-sm hover:bg-emerald-400 active:scale-95 transition"
        >
          {actionText || 'Reload'}
        </button>
      )}
    </div>
  );
}
