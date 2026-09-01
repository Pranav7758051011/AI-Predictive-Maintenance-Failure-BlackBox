import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import FeatureImportance from '../components/FeatureImportance';
import { FiCpu, FiCheckCircle, FiShield, FiBarChart2, FiLayers, FiInfo } from 'react-icons/fi';

export default function MLInsights() {
  const modelFeatureWeights = {
    "Torque (Nm)": 28,
    "Rotational Speed (RPM)": 24,
    "Process Temp (K)": 18,
    "Tool Wear (min)": 14,
    "Temp Difference (ΔT)": 10,
    "Mechanical Power (W)": 6
  };

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-industrial-text">Machine Learning Architecture & Metrics</h1>
              <p className="text-xs text-industrial-subtext">Dual-Stage Native XGBoost Engine trained on AI4I 2020 Predictive Maintenance Dataset (10,000 samples)</p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              <FiCheckCircle className="text-emerald-600" />
              <span>Native XGBoost v1.0 Validated</span>
            </div>
          </div>

          {/* Top Performance Metrics Grid (Stage 1 Binary Predictor) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="industrial-card p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-industrial-subtext">TEST ACCURACY</span>
              <div className="text-2xl font-extrabold font-mono text-steel-blue mt-1">97.75%</div>
            </div>

            <div className="industrial-card p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-industrial-subtext">PRECISION</span>
              <div className="text-2xl font-extrabold font-mono text-industrial-text mt-1">63.75%</div>
            </div>

            <div className="industrial-card p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-industrial-subtext">RECALL</span>
              <div className="text-2xl font-extrabold font-mono text-industrial-text mt-1">76.12%</div>
            </div>

            <div className="industrial-card p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-industrial-subtext">F1 SCORE</span>
              <div className="text-2xl font-extrabold font-mono text-industrial-orange mt-1">0.6939</div>
            </div>

            <div className="industrial-card p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-industrial-subtext">ROC AUC</span>
              <div className="text-2xl font-extrabold font-mono text-status-success mt-1">0.9670</div>
            </div>
          </div>

          {/* Model Architecture & Specifications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Model Details (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Algorithm Details */}
              <div className="industrial-card p-5 space-y-4">
                <h3 className="text-base font-bold text-industrial-text pb-2 border-b border-industrial-border">
                  Dual-Stage Inference Pipeline
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-2.5 rounded bg-industrial-gray/60 border border-industrial-border font-mono">
                    <span className="text-industrial-subtext font-sans font-bold">Stage 1 (Binary Breakdown):</span>
                    <strong className="text-steel-blue">Native XGBoost Booster (binary:logistic)</strong>
                  </div>

                  <div className="flex justify-between p-2.5 rounded bg-industrial-gray/60 border border-industrial-border font-mono">
                    <span className="text-industrial-subtext font-sans font-bold">Class Imbalance Correction:</span>
                    <strong className="text-industrial-orange">scale_pos_weight = 28.5:1</strong>
                  </div>

                  <div className="flex justify-between p-2.5 rounded bg-industrial-gray/60 border border-industrial-border font-mono">
                    <span className="text-industrial-subtext font-sans font-bold">Stage 2 (Multiclass Mode):</span>
                    <strong className="text-steel-blue">Native XGBoost Booster (multi:softprob)</strong>
                  </div>

                  <div className="flex justify-between p-2.5 rounded bg-industrial-gray/60 border border-industrial-border font-mono">
                    <span className="text-industrial-subtext font-sans font-bold">Multiclass Target Modes:</span>
                    <strong className="text-industrial-text">HDF, PWF, OSF, TWF, RNF (Macro F1: 0.781)</strong>
                  </div>

                  <div className="flex justify-between p-2.5 rounded bg-industrial-gray/60 border border-industrial-border font-mono">
                    <span className="text-industrial-subtext font-sans font-bold">Dataset Foundation:</span>
                    <strong className="text-industrial-text">AI4I 2020 Dataset (10,000 Records, 80/20 Split)</strong>
                  </div>
                </div>
              </div>

              {/* Scientific Boundary Notice */}
              <div className="industrial-card p-5 space-y-3 bg-white">
                <div className="flex items-center gap-2 text-steel-blue font-bold text-sm border-b border-industrial-border pb-2">
                  <FiInfo className="text-industrial-orange text-base" />
                  <span>Scientific Validation & Explainability Status</span>
                </div>
                <p className="text-xs text-industrial-subtext leading-relaxed">
                  The current production release strictly evaluates genuine ML probability scores and health scores. Automated SHAP / textual root-cause claims and estimated RUL ranges are deliberately withheld until formally validated degradation physics models are integrated.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                  Remaining Useful Life (RUL): <strong>RUL: Not available</strong>
                </div>
              </div>
            </div>

            {/* Right Column: Global Feature Importance (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              <FeatureImportance features={modelFeatureWeights} />

              <div className="industrial-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-industrial-text pb-2 border-b border-industrial-border">
                  11 Preprocessing Input Features
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">1. air_temp (K)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">2. process_temp (K)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">3. rotational_speed (RPM)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">4. torque (Nm)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">5. tool_wear (min)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">6. temperature_diff (ΔT)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">7. power (W)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">8. overstrain (wear×torque)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">9. type_H (One-Hot)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">10. type_L (One-Hot)</div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 col-span-2">11. type_M (One-Hot)</div>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

      <Footer />
    </div>
  );
}
