import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiMonitor,
  FiBox,
  FiActivity,
  FiTrendingUp,
  FiAlertTriangle,
  FiTool,
  FiCpu,
  FiClock,
  FiArchive,
  FiShield,
  FiUser
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: FiMonitor },
  { path: '/equipment', label: 'Equipment', icon: FiBox },
  { path: '/sensors', label: 'Live Sensors', icon: FiActivity },
  { path: '/predictions', label: 'Predictions', icon: FiTrendingUp },
  { path: '/blackboxes', label: 'Failure Black Box', icon: FiArchive },
  { path: '/anomalies', label: 'Anomalies', icon: FiAlertTriangle },
  { path: '/maintenance', label: 'Maintenance', icon: FiTool },
  { path: '/ml-insights', label: 'ML Insights', icon: FiCpu },
  { path: '/history', label: 'History', icon: FiClock },
];

export default function Sidebar() {
  const { user, role, isAuthenticated } = useAuth();

  return (
    <aside className="w-64 bg-steel-blue-dark text-slate-200 border-r border-slate-700 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0 hidden lg:flex select-none">
      
      <div className="space-y-6">
        {/* Section Header */}
        <div className="px-3 pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">OPERATIONAL CONSOLE</div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition duration-200 ${
                    isActive
                      ? 'bg-industrial-orange text-white font-semibold shadow-glow-orange'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:pl-4'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-industrial-orange rounded-r group-hover:h-5 transition-all duration-200" />
                    )}
                    <Icon className={`text-lg shrink-0 transition duration-200 ${isActive ? 'scale-110' : 'group-hover:text-industrial-orange group-hover:scale-110'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User / Plant Info at Sidebar Bottom */}
      <div className="space-y-3">
        {isAuthenticated && (
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-700 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <FiUser className="text-industrial-orange" />
              <span className="truncate">{user?.full_name || 'Operator'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Role: <strong className="text-emerald-400 font-bold">{role}</strong></span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">RBAC ACTIVE</span>
            </div>
          </div>
        )}

        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold">Flask ML Engine</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">XGBoost Native v1.0</div>
        </div>
      </div>

    </aside>
  );
}
