import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Radio, 
  Leaf, 
  Cpu, 
  Droplets, 
  BarChart3, 
  Activity, 
  Bell, 
  LogOut,
  User
} from 'lucide-react';

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/farmers', label: 'Farmers', icon: Users },
    { to: '/central-nodes', label: 'Central Nodes', icon: Radio },
    { to: '/field-nodes', label: 'Field Nodes', icon: Leaf },
    { to: '/water-analytics', label: 'Water Analytics', icon: Droplets },
    { to: '/farm-analytics', label: 'Farm Analytics', icon: BarChart3 },
    { to: '/activity', label: 'Activity', icon: Activity },
    { to: '/alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="w-64 bg-field-sidebar flex flex-col h-screen fixed top-0 left-0 z-30 shadow-lg text-emerald-100">
      {/* Brand Logo Header */}
      <div className="h-20 flex items-center px-6 border-b border-emerald-900/40 bg-emerald-950/20">
        <img src="/LIV_Logo.png" alt="LIV Logo" className="h-10 w-auto rounded-lg bg-white p-0.5" />
        <div className="ml-3">
          <span className="font-extrabold text-lg text-white tracking-tight font-display">LIV Smart</span>
          <span className="block text-[9px] uppercase tracking-widest text-emerald-400 font-semibold font-display">Admin NOC Portal</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-field-primary text-white font-semibold shadow-inner'
                    : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/20'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile Box */}
      <div className="p-4 border-t border-emerald-900/40 bg-emerald-950/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/40">
          <div className="rounded-lg bg-emerald-850 p-2 text-emerald-300">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{profile?.name || 'Admin User'}</p>
            <p className="text-[10px] text-emerald-400/80 truncate font-semibold uppercase tracking-wider">{profile?.role || 'Admin'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-emerald-400/60 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800/35 transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
