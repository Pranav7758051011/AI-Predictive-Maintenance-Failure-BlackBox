import React from 'react';
import { FiPlay, FiRefreshCw, FiSliders, FiActivity, FiCheckCircle } from 'react-icons/fi';

export default function SimulationControls({
  simulationMode,
  simulationStep,
  isSimulating,
  onTrigger,
  onReset
}) {
  const stepsLabels = [
    "Step 0: Normal Baseline",
    "Step 1: Minor Sensor Shift",
    "Step 2: Thermal & Vib Drift",
    "Step 3: Anomaly Escalation",
    "Step 4: Imminent Failure"
  ];

  return (
    <div className="industrial-card p-5 border-l-4 border-l-industrial-orange space-y-4 hover:shadow-industrial-hover transition duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-industrial-orange animate-ping" />
            <h3 className="text-base font-extrabold text-industrial-text uppercase tracking-wide">Interactive Telemetry Simulator</h3>
          </div>
          <p className="text-xs text-industrial-subtext mt-0.5">Inject physical degradation faults to test machine learning prediction & 3D anomaly responses in real-time.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onTrigger("failure")}
            disabled={isSimulating}
            className="btn-industrial inline-flex items-center gap-2 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded shadow-sm hover:shadow-glow-orange transition transform active:scale-95 disabled:opacity-50"
          >
            <FiPlay className={isSimulating ? 'animate-spin' : ''} />
            <span>Simulate Sensor Data</span>
          </button>

          <button
            onClick={onReset}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 bg-industrial-gray hover:bg-slate-200 text-industrial-text text-xs font-bold uppercase px-3 py-2.5 rounded border border-industrial-border transition"
            title="Reset to Normal Baseline"
          >
            <FiRefreshCw />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Step Selector Pipeline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-industrial-subtext uppercase tracking-wider">
          <span>Degradation Pipeline State</span>
          <span className="text-steel-blue font-mono font-extrabold">{stepsLabels[simulationStep]}</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((stepIdx) => (
            <button
              key={stepIdx}
              onClick={() => onTrigger("failure", stepIdx)}
              className={`p-2 rounded text-center text-xs font-bold border transition-all duration-200 transform hover:-translate-y-0.5 ${
                simulationStep === stepIdx
                  ? stepIdx === 0
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm scale-[1.02]'
                    : stepIdx < 3
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-[1.02]'
                    : 'bg-red-600 text-white border-red-700 shadow-sm scale-[1.02]'
                  : 'bg-industrial-gray/70 text-industrial-subtext border-industrial-border hover:bg-industrial-gray hover:text-industrial-text'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-slate-300">Stage {stepIdx}</div>
              <div className="truncate mt-0.5 text-[11px]">
                {stepIdx === 0 ? 'Normal' : stepIdx === 1 ? 'Mild' : stepIdx === 2 ? 'Drift' : stepIdx === 3 ? 'Warning' : 'Failure'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
