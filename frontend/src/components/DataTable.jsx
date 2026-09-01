import React from 'react';
import { Link } from 'react-router-dom';
import RiskBadge from './RiskBadge';

export default function DataTable({ machines = [], onSelectMachine, activeMachineId }) {
  if (!machines || machines.length === 0) {
    return (
      <div className="industrial-card p-8 text-center text-xs text-industrial-subtext">
        No equipment records found in the database.
      </div>
    );
  }

  return (
    <div className="industrial-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-industrial-gray border-b border-industrial-border text-industrial-subtext uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3.5 px-4">Serial Number</th>
              <th className="py-3.5 px-4">Machine Name</th>
              <th className="py-3.5 px-4">Product Type</th>
              <th className="py-3.5 px-4">Health %</th>
              <th className="py-3.5 px-4">Operating Status</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Assigned Engineer</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-border">
            {machines.map((m) => {
              const health = m.current_health_score !== undefined && m.current_health_score !== null ? m.current_health_score : 100;
              const isSelected = activeMachineId === m.id;

              const statusColor =
                m.status === 'CRITICAL' ? 'text-status-failure bg-red-50 border-red-200' :
                m.status === 'WARNING' ? 'text-status-warning bg-amber-50 border-amber-200' :
                'text-status-success bg-emerald-50 border-emerald-200';

              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectMachine && onSelectMachine(m.id)}
                  className={`industrial-row cursor-pointer transition duration-150 group ${
                    isSelected ? 'bg-slate-100/90 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-steel-blue font-mono group-hover:text-industrial-orange transition">
                    {m.serial_number || m.id}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-industrial-text">
                    {m.name}
                  </td>
                  <td className="py-3.5 px-4 text-industrial-subtext font-mono font-medium">
                    {m.product_type || 'M'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-industrial-gray rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            health >= 75 ? 'bg-status-success' : health >= 50 ? 'bg-status-warning' : 'bg-status-failure'
                          }`}
                          style={{ width: `${health}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-industrial-text">{Math.round(health)}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}>
                      {m.status || 'HEALTHY'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-industrial-subtext font-medium">
                    {m.location || 'Main Bay'}
                  </td>
                  <td className="py-3.5 px-4 text-industrial-subtext">
                    {m.assigned_engineer?.full_name || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/equipment/${m.id}`}
                      className="text-steel-blue hover:text-industrial-orange font-bold text-xs underline transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
