import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import LiveIndicator from '../components/LiveIndicator';

export default function AdminLayout() {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'System Overview';
    if (path === '/farmers') return 'Farmers Management';
    if (path === '/central-nodes') return 'Central Nodes';
    if (path === '/field-nodes') return 'Field Nodes';
    if (path === '/water-analytics') return 'Water Analytics';
    if (path === '/farm-analytics') return 'Farm Analytics';
    if (path === '/activity') return 'System Activity Log';
    if (path === '/alerts') return 'System-wide Alerts';
    return 'LIV Admin Portal';
  };

  return (
    <div className="min-h-screen bg-field-bg text-field-text-primary flex">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-field-border flex items-center justify-between px-8 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-field-text-primary tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="text-[10px] text-field-text-secondary uppercase tracking-widest font-bold mt-0.5">
              Network Operations Center
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Live socket connection status */}
            <LiveIndicator />
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
