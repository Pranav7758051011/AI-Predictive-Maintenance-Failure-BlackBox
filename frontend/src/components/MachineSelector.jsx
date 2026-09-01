import React from 'react';
import { FiBox } from 'react-icons/fi';

export default function MachineSelector({ machines = [], activeId, onSelect }) {
  if (!machines || machines.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-industrial-subtext flex items-center gap-1.5 mr-1">
        <FiBox className="text-steel-blue" /> Select Asset:
      </span>

      {machines.map((m) => {
        const health = m.current_health_score !== undefined && m.current_health_score !== null ? m.current_health_score : (m.health || 100);
        const isSelected = activeId === m.id;

        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition ${
              isSelected
                ? 'bg-steel-blue text-white border-steel-blue-dark shadow-sm'
                : 'bg-white text-industrial-text border-industrial-border hover:bg-industrial-gray'
            }`}
          >
            <span>{m.serial_number || m.name || m.id}</span>
            <span className={`ml-1.5 font-mono text-[11px] ${isSelected ? 'text-slate-200' : 'text-industrial-subtext'}`}>
              ({Math.round(health)}%)
            </span>
          </button>
        );
      })}
    </div>
  );
}
