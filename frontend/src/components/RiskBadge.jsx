import React from 'react';

export default function RiskBadge({ level = 'LOW' }) {
  const lvl = level ? level.toUpperCase() : 'LOW';

  const styles = {
    LOW: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400',
    HIGH: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100 hover:border-orange-400',
    CRITICAL: 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100 hover:border-red-400'
  };

  const dots = {
    LOW: 'bg-emerald-500',
    MEDIUM: 'bg-amber-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500 animate-pulse'
  };

  const badgeStyle = styles[lvl] || styles.LOW;
  const dotStyle = dots[lvl] || dots.LOW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider transition duration-200 cursor-default select-none ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      <span>{lvl} RISK</span>
    </span>
  );
}
