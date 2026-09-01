import React from 'react';
import { FiTrendingUp, FiClock, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import RiskBadge from './RiskBadge';

export default function PredictionCard({ prediction, machineName = "Equipment" }) {
  const {
    failure_probability = 0.04,
    failure_prediction = false,
    failure_type = "NO_FAILURE",
    health_score = 100,
    confidence = 0.95,
    model_version = "failure-model-v1.0"
  } = prediction || {};

  const failurePercent = Math.round((failure_probability || 0) * 100);
  const confidencePercent = Math.round((confidence || 0) * 100);

  const risk_level =
    health_score >= 75 ? 'LOW' :
    health_score >= 50 ? 'MEDIUM' :
    health_score >= 25 ? 'HIGH' : 'CRITICAL';

  const riskConfig = {
    LOW:      { bar: 'bg-status-success',  text: 'text-status-success',  bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Nominal Operating Condition' },
    MEDIUM:   { bar: 'bg-status-warning',  text: 'text-status-warning',  bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'Moderate degradation' },
    HIGH:     { bar: 'bg-industrial-orange', text: 'text-industrial-orange', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Elevated failure probability' },
    CRITICAL: { bar: 'bg-status-failure',  text: 'text-status-failure',  bg: 'bg-red-50',     border: 'border-red-200',    label: 'Critical breakdown imminent' },
  };

  const cfg = riskConfig[risk_level] || riskConfig.LOW;

  return (
    <div className={`industrial-card p-5 space-y-5 hover:shadow-industrial-hover transition duration-300 border-t-4 ${
      risk_level === 'LOW' ? 'border-t-status-success' :
      risk_level === 'MEDIUM' ? 'border-t-status-warning' :
      risk_level === 'HIGH' ? 'border-t-industrial-orange' :
      'border-t-status-failure'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-industrial-border">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded ${cfg.bg} ${cfg.text} flex items-center justify-center font-bold border ${cfg.border}`}>
            <FiTrendingUp className="text-lg" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-industrial-text">XGBoost Failure Prediction</h3>
            <p className="text-xs text-industrial-subtext font-mono">{machineName}</p>
          </div>
        </div>
        <RiskBadge level={risk_level} />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cfg.bg} p-3.5 rounded-md border ${cfg.border} hover:shadow-sm transition`}>
          <span className="text-[10px] uppercase font-bold text-industrial-subtext block">Failure Probability</span>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${cfg.text}`}>
            {failurePercent}%
          </div>
          <span className="text-[11px] text-industrial-subtext font-medium mt-0.5 block">{cfg.label}</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 hover:shadow-sm transition">
          <span className="text-[10px] uppercase font-bold text-industrial-subtext block">Classified Failure Mode</span>
          <div className={`text-xl font-extrabold font-mono mt-1 ${failure_type !== 'NO_FAILURE' ? 'text-red-600' : 'text-emerald-700'}`}>
            {failure_type}
          </div>
          <span className="text-[11px] text-industrial-subtext font-medium mt-0.5 block">
            {failure_type === 'HDF' ? 'Heat Dissipation Failure' :
             failure_type === 'PWF' ? 'Power Failure' :
             failure_type === 'OSF' ? 'Overstrain Failure' :
             failure_type === 'TWF' ? 'Tool Wear Failure' :
             failure_type === 'RNF' ? 'Random Failure' : 'Optimal Nominal State'}
          </span>
        </div>
      </div>

      {/* Risk Gauge Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-industrial-subtext">
          <span>Failure Risk Spectrum</span>
          <span className={`font-mono font-bold ${cfg.text}`}>{failurePercent}% Probability</span>
        </div>
        <div className="h-3.5 w-full bg-industrial-gray rounded-full overflow-hidden flex p-0.5 border border-industrial-border">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
            style={{ width: `${Math.max(4, failurePercent)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-industrial-subtext uppercase">
          <span>LOW (&lt;25%)</span>
          <span>MEDIUM</span>
          <span>HIGH</span>
          <span>CRITICAL (&gt;75%)</span>
        </div>
      </div>

      {/* Model Confidence & Version */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-industrial-border">
        <span className="flex items-center gap-1.5 text-industrial-subtext">
          <FiShield className={`text-base ${cfg.text}`} /> Model Confidence: <strong className="text-industrial-text font-mono">{confidencePercent}%</strong>
        </span>
        <span className="font-mono text-[11px] text-slate-400">Engine: {model_version}</span>
      </div>
    </div>
  );
}
