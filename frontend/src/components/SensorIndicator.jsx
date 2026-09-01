import React from 'react';

export default function SensorIndicator({ label, value, unit, status = 'normal', icon: Icon }) {
  let statusBorder = "border-industrial-border hover:border-steel-blue/60";
  let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let statusText = "NORMAL";

  if (status === 'warning') {
    statusBorder = "border-amber-300 bg-amber-50/40 hover:border-amber-400";
    badgeBg = "bg-amber-100 text-amber-800 border-amber-300";
    statusText = "WARNING";
  } else if (status === 'critical' || status === 'high') {
    statusBorder = "border-red-400 bg-red-50/40 hover:border-red-500 shadow-glow-orange/20";
    badgeBg = "bg-red-100 text-red-800 border-red-300 animate-pulse";
    statusText = "HIGH RISK";
  }

  return (
    <div className={`p-4 rounded-lg bg-white border ${statusBorder} shadow-sm transition duration-300 hover:shadow-industrial-hover hover:-translate-y-0.5 group`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-industrial-subtext group-hover:text-steel-blue transition">{label}</span>
        {Icon && <Icon className="text-industrial-subtext group-hover:text-steel-blue text-base group-hover:scale-110 transition duration-200" />}
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold font-mono text-industrial-text group-hover:text-steel-blue transition">{value}</span>
          <span className="text-xs font-semibold text-industrial-subtext">{unit}</span>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeBg}`}>
          {statusText}
        </span>
      </div>
    </div>
  );
}
