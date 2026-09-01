import React from 'react';

export default function HealthGauge({ value = 92, size = 120, strokeWidth = 10, showLabel = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let color = "#2E7D5B"; // Green (>80)
  if (value < 40) color = "#C73E3A"; // Red (<40)
  else if (value < 60) color = "#D99520"; // Amber (40-59)
  else if (value < 80) color = "#D99520"; // Amber (60-79)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8EBE7"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-extrabold font-mono text-industrial-text">{value}%</span>
          <span className="text-[10px] font-bold uppercase text-industrial-subtext">HEALTH</span>
        </div>
      )}
    </div>
  );
}
