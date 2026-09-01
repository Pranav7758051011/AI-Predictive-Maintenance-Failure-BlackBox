import React from 'react';
import { FiTool, FiClock, FiCheckSquare } from 'react-icons/fi';

export default function MaintenanceCard({ recommendation }) {
  const {
    id = "REC-101",
    machine_id = "MOTOR-308",
    machine_name = "Industrial Motor",
    priority = "HIGH",
    issue = "Severe bearing vibration (8.1 mm/s) & thermal overload (96.5°C)",
    recommendation: recText = "Replace drive end bearings and inspect motor stator windings.",
    reason = "Vibration exceeds ISO 10816 Class II critical limit by 180%. High failure probability.",
    action = "Immediate emergency shutdown & overhaul within 24 hours.",
    suggested_window = "Immediate (Next Shutdown)"
  } = recommendation || {};

  const priorityConfig = {
    HIGH: {
      border: "border-l-4 border-l-status-failure",
      badge: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
      accentBg: "bg-red-50/60",
      hoverBorder: "hover:border-red-400",
      icon: "text-red-500"
    },
    MEDIUM: {
      border: "border-l-4 border-l-status-warning",
      badge: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200",
      accentBg: "bg-amber-50/60",
      hoverBorder: "hover:border-amber-400",
      icon: "text-amber-500"
    },
    LOW: {
      border: "border-l-4 border-l-steel-blue",
      badge: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
      accentBg: "bg-blue-50/40",
      hoverBorder: "hover:border-steel-blue",
      icon: "text-steel-blue"
    }
  };

  const config = priorityConfig[priority] || priorityConfig.LOW;

  return (
    <div className={`industrial-card p-5 space-y-4 hover:shadow-industrial-hover hover:-translate-y-1 transition duration-300 group ${config.border}`}>

      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-industrial-border group-hover:border-slate-300 transition">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-industrial-text group-hover:text-steel-blue transition">{machine_id}</span>
            <span className="text-xs font-medium text-industrial-subtext">({machine_name})</span>
          </div>
          <p className="text-xs font-semibold text-industrial-orange mt-0.5">{issue}</p>
        </div>

        <span className={`px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider transition ${config.badge}`}>
          {priority} PRIORITY
        </span>
      </div>

      {/* Main Action Block */}
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-bold text-steel-blue uppercase tracking-wider block text-[10px]">Recommended Action</span>
          <p className="text-industrial-text font-medium mt-0.5 group-hover:text-steel-blue-dark transition">{recText}</p>
        </div>

        <div className={`${config.accentBg} p-3 rounded border border-industrial-border mt-2 group-hover:border-slate-300 transition`}>
          <span className="font-bold text-industrial-subtext uppercase tracking-wider block text-[10px]">Engineering Rationale</span>
          <p className="text-industrial-subtext mt-0.5">{reason}</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-industrial-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-industrial-subtext">
        <div className="flex items-center gap-1.5">
          <FiClock className={`${config.icon} text-sm`} />
          <span>Suggested Window: <strong className="text-industrial-text">{suggested_window}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-steel-blue group-hover:text-industrial-orange transition">
          <FiCheckSquare />
          <span>{action}</span>
        </div>
      </div>
    </div>
  );
}
