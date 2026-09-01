import React from 'react';
import { FiInfo } from 'react-icons/fi';

export default function DemoModeBadge({ compact = false }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
        <FiInfo /> DEMO MODE
      </span>
    );
  }

  return (
    <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200" title="This application uses sample simulated sensor data and standard ML model outputs for demonstration purposes.">
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="uppercase text-[11px] font-bold tracking-wider">Demo Mode</span>
    </div>
  );
}
