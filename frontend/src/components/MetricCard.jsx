import React from 'react';

export default function MetricCard({ title, value, subtext, icon: Icon, statusColor = "steel-blue", trend }) {
  return (
    <div className="industrial-card p-5 flex flex-col justify-between hover:shadow-industrial-hover hover:border-steel-blue/50 transition duration-300 group cursor-default">
      {/* Subtle top border accent glow on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-gradient-to-r group-hover:from-steel-blue group-hover:to-industrial-orange transition-all duration-300" />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-industrial-subtext group-hover:text-steel-blue transition">{title}</span>
          <div className="text-2xl font-extrabold text-industrial-text mt-1.5 font-mono tracking-tight group-hover:scale-[1.02] transition origin-left">{value}</div>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-md bg-industrial-gray group-hover:bg-steel-blue group-hover:text-white text-steel-blue flex items-center justify-center text-xl shrink-0 transition duration-300 group-hover:scale-110 shadow-sm">
            <Icon />
          </div>
        )}
      </div>

      {subtext && (
        <div className="mt-3 pt-2.5 border-t border-industrial-border group-hover:border-industrial-border-dark flex items-center justify-between text-xs text-industrial-subtext transition">
          <span>{subtext}</span>
          {trend && (
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              trend.startsWith('+')
                ? 'bg-amber-50 text-status-warning border border-amber-200'
                : 'bg-emerald-50 text-status-success border border-emerald-200'
            }`}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
