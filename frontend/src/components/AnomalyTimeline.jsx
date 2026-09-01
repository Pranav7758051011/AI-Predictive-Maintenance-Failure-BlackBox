import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiArchive } from 'react-icons/fi';

const severityConfig = {
  HIGH: {
    row: 'bg-red-50/60 border-red-200 hover:bg-red-100/80 hover:border-red-400',
    icon: 'bg-red-100 text-red-700 group-hover:bg-red-200',
    badge: 'text-red-700 font-bold',
    pulse: 'bg-red-500'
  },
  MEDIUM: {
    row: 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/80 hover:border-amber-400',
    icon: 'bg-amber-100 text-amber-700 group-hover:bg-amber-200',
    badge: 'text-amber-700 font-bold',
    pulse: 'bg-amber-500'
  },
  LOW: {
    row: 'bg-white border-industrial-border hover:bg-industrial-gray/50 hover:border-steel-blue/40',
    icon: 'bg-slate-100 text-slate-700 group-hover:bg-slate-200',
    badge: 'text-steel-blue font-bold',
    pulse: 'bg-steel-blue'
  }
};

export default function AnomalyTimeline({ events = [] }) {
  const highCount = events.filter(e => e.severity === 'HIGH').length;
  const medCount = events.filter(e => e.severity === 'MEDIUM').length;
  const lowCount = events.filter(e => e.severity === 'LOW').length;

  return (
    <div className="industrial-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-industrial-border">
        <div>
          <h3 className="text-base font-bold text-industrial-text">ML Anomaly & Degradation Event Log</h3>
          <p className="text-xs text-industrial-subtext">Real-time alerts triggered by XGBoost failure classifications and severe telemetry drift</p>
        </div>

        {/* Severity Summary Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-800 font-bold border border-red-200 cursor-default">
            Critical: {highCount}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200 cursor-default">
            Degraded: {medCount}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 cursor-default">
            Nominal: {lowCount}
          </span>
        </div>
      </div>

      {/* Timeline List */}
      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-industrial-subtext">
          No critical anomalies or failure alerts recorded.
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((evt) => {
            const cfg = severityConfig[evt.severity] || severityConfig.LOW;
            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-md border text-xs flex items-start gap-3 transition duration-200 group ${cfg.row}`}
              >
                {/* Severity Icon Badge */}
                <div className={`p-2 rounded-md shrink-0 transition ${cfg.icon}`}>
                  <FiAlertTriangle className="text-base" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-industrial-text truncate group-hover:text-steel-blue transition">{evt.title}</span>
                    <span className="font-mono text-industrial-subtext shrink-0 flex items-center gap-1">
                      <FiClock className="text-xs" />
                      {evt.time}
                    </span>
                  </div>
                  <p className="text-industrial-subtext mt-0.5">{evt.detail}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-[10px] font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-industrial-border font-mono">{evt.machine}</span>
                      <span className={`uppercase ${cfg.badge}`}>{evt.severity} SEVERITY</span>
                      {evt.severity === 'HIGH' && (
                        <span className="flex items-center gap-1 text-red-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-ping`} />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {evt.blackbox_id && (
                      <Link
                        to={`/blackboxes/${evt.blackbox_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-industrial-orange hover:underline font-mono"
                      >
                        <FiArchive /> View Black Box ({evt.blackbox_code})
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
