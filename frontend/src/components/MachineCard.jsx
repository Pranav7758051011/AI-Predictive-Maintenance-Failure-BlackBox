import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiActivity, FiUser, FiMapPin } from 'react-icons/fi';
import RiskBadge from './RiskBadge';
import HealthGauge from './HealthGauge';

export default function MachineCard({ machine }) {
  const {
    id,
    serial_number,
    name,
    product_type,
    location,
    status = 'HEALTHY',
    current_health_score = 100,
    assigned_engineer
  } = machine;

  const health = current_health_score !== undefined && current_health_score !== null ? current_health_score : 100;
  const riskLevel =
    health >= 75 ? 'LOW' :
    health >= 50 ? 'MEDIUM' :
    health >= 25 ? 'HIGH' : 'CRITICAL';

  const statusColor =
    status === 'CRITICAL' ? 'text-status-failure bg-red-50 border-red-200' :
    status === 'WARNING' ? 'text-status-warning bg-amber-50 border-amber-200' :
    'text-status-success bg-emerald-50 border-emerald-200';

  return (
    <div className="industrial-card p-5 hover:shadow-industrial-hover hover:border-steel-blue transition duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Top hover accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-industrial-orange transition-all duration-300" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-industrial-border group-hover:border-slate-300 transition">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-steel-blue font-mono group-hover:text-industrial-orange transition">
                {serial_number || id}
              </span>
              <RiskBadge level={riskLevel} />
            </div>
            <h4 className="text-sm font-bold text-industrial-text mt-0.5">{name}</h4>
          </div>
          <div className="transform group-hover:scale-105 transition duration-300">
            <HealthGauge value={Math.round(health)} size={54} strokeWidth={6} />
          </div>
        </div>

        {/* Location & Status */}
        <div className="mt-3 text-xs text-industrial-subtext flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FiMapPin className="text-slate-400" />
            <span className="truncate">{location || 'Main Factory Bay'}</span>
          </span>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}>
            {status}
          </span>
        </div>

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50 group-hover:bg-slate-100/80 p-3 rounded-md border border-industrial-border transition text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Grade</span>
            <span className="font-mono font-bold text-industrial-text">Type {product_type || 'M'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Engineer</span>
            <span className="font-medium text-slate-700 truncate block">
              {assigned_engineer?.full_name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-4 pt-3 border-t border-industrial-border flex items-center justify-between">
        <span className="text-xs font-semibold text-industrial-subtext">Health: {Math.round(health)}%</span>
        <Link
          to={`/equipment/${id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-steel-blue hover:text-industrial-orange transition group-hover:translate-x-0.5"
        >
          <span>Monitor & Details</span>
          <FiArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
