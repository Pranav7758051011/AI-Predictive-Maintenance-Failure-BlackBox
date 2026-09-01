import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

const METRIC_CONFIGS = {
  process_temp: {
    label: 'Process Temp (K)',
    color: '#E85D25',
    threshold: 312.0,
    unit: 'K',
    bg: 'bg-orange-50',
    text: 'text-industrial-orange',
    activeBg: 'bg-industrial-orange text-white shadow-sm'
  },
  air_temp: {
    label: 'Air Temp (K)',
    color: '#234B63',
    threshold: 304.0,
    unit: 'K',
    bg: 'bg-blue-50',
    text: 'text-steel-blue',
    activeBg: 'bg-steel-blue text-white shadow-sm'
  },
  rotational_speed: {
    label: 'Rotational Speed (RPM)',
    color: '#0284C7',
    threshold: 2400,
    unit: 'RPM',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    activeBg: 'bg-sky-600 text-white shadow-sm'
  },
  torque: {
    label: 'Torque (Nm)',
    color: '#F59E0B',
    threshold: 60.0,
    unit: 'Nm',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    activeBg: 'bg-amber-500 text-white shadow-sm'
  },
  tool_wear: {
    label: 'Tool Wear (min)',
    color: '#DC2626',
    threshold: 200.0,
    unit: 'min',
    bg: 'bg-red-50',
    text: 'text-red-600',
    activeBg: 'bg-red-600 text-white shadow-sm'
  },
  temperature_difference: {
    label: 'Temp Difference ΔT (K)',
    color: '#0F766E',
    threshold: 13.0,
    unit: 'K',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    activeBg: 'bg-teal-600 text-white shadow-sm'
  }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-industrial-border rounded-md shadow-industrial px-3.5 py-2.5 text-xs font-mono">
        <p className="font-bold text-industrial-text mb-1.5 border-b border-industrial-border pb-1 font-sans">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SensorChart({ data = [], height = 340 }) {
  const [selectedMetric, setSelectedMetric] = useState('process_temp');
  const currentConfig = METRIC_CONFIGS[selectedMetric] || METRIC_CONFIGS.process_temp;

  // Format chart data points
  const chartData = data.map((d, idx) => {
    const ts = d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : `#${idx + 1}`;
    const pTemp = d.process_temp || 308.6;
    const aTemp = d.air_temp || 298.1;
    return {
      time: ts,
      process_temp: pTemp,
      air_temp: aTemp,
      rotational_speed: d.rotational_speed || 1550,
      torque: d.torque || 42.0,
      tool_wear: d.tool_wear || 20,
      temperature_difference: d.temperature_difference ?? Number((pTemp - aTemp).toFixed(1))
    };
  });

  return (
    <div className="industrial-card p-5 space-y-4 hover:shadow-industrial-hover transition duration-300">

      {/* Header & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-border">
        <div>
          <h3 className="text-base font-bold text-industrial-text">Live Sensor Telemetry Timeline</h3>
          <p className="text-xs text-industrial-subtext">Real-time sensor pattern analysis & upper threshold alert bounds</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-industrial-gray p-1 rounded-md border border-industrial-border">
          {Object.entries(METRIC_CONFIGS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition duration-200 ${
                selectedMetric === key
                  ? cfg.activeBg
                  : `text-industrial-subtext hover:text-industrial-text`
              }`}
            >
              {key.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Active Metric Summary Strip */}
      <div className={`${currentConfig.bg} border border-slate-200 rounded-md px-4 py-2 flex items-center justify-between text-xs`}>
        <span className={`font-bold uppercase tracking-wider ${currentConfig.text}`}>{currentConfig.label}</span>
        <span className="font-mono text-industrial-subtext">
          Alert Threshold: <strong className="text-status-failure">&gt; {currentConfig.threshold} {currentConfig.unit}</strong>
        </span>
      </div>

      {/* Chart Canvas */}
      {chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">
          No sensor telemetry records available for this asset.
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EBE7" />
              <XAxis dataKey="time" stroke="#59656A" fontSize={11} tick={{ fill: '#59656A' }} />
              <YAxis stroke="#59656A" fontSize={11} tick={{ fill: '#59656A' }} domain={['auto', 'auto']} />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

              <ReferenceLine
                y={currentConfig.threshold}
                label={{
                  value: `Limit: ${currentConfig.threshold} ${currentConfig.unit}`,
                  fill: '#EF4444',
                  fontSize: 10,
                  position: 'insideTopRight'
                }}
                stroke="#EF4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />

              <Line
                type="monotone"
                dataKey={selectedMetric}
                name={currentConfig.label}
                stroke={currentConfig.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: currentConfig.color }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
