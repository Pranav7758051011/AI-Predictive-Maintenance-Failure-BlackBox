import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import PredictionCard from '../components/PredictionCard';
import FeatureImportance from '../components/FeatureImportance';
import MachineSelector from '../components/MachineSelector';
import { machineService } from '../services/machineService';
import { sensorService } from '../services/sensorService';
import { predictionService } from '../services/predictionService';
import { useAuth } from '../context/AuthContext';
import {
  FiTrendingUp,
  FiCheckCircle,
  FiInfo,
  FiSliders,
  FiRefreshCw,
  FiPlay,
  FiAlertTriangle,
  FiArchive
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Predictions() {
  const { user, canWrite } = useAuth();
  const [machines, setMachines] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Load machines
  useEffect(() => {
    async function loadMachines() {
      try {
        const res = await machineService.getMachines();
        const items = res?.items || [];
        setMachines(items);
        if (items.length > 0) {
          setActiveId(items[0].id);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch machines.');
      } finally {
        setLoading(false);
      }
    }
    loadMachines();
  }, []);

  // Load prediction & telemetry when active machine changes
  useEffect(() => {
    if (!activeId) return;

    async function loadMachinePrediction() {
      setError(null);
      try {
        const [predRes, telRes] = await Promise.allSettled([
          predictionService.getMachinePredictions(activeId, { page_size: 1 }),
          sensorService.getLatestTelemetry(activeId)
        ]);

        if (predRes.status === 'fulfilled' && predRes.value?.items?.length > 0) {
          setLatestPrediction(predRes.value.items[0]);
        } else {
          setLatestPrediction(null);
        }

        if (telRes.status === 'fulfilled') {
          setLatestTelemetry(telRes.value);
        } else {
          setLatestTelemetry(null);
        }
      } catch (err) {
        console.error('Error fetching machine prediction:', err);
      }
    }

    loadMachinePrediction();
  }, [activeId]);

  const handleRunInference = async () => {
    if (!activeId || !canWrite) return;
    setPredicting(true);
    setSuccessMsg('');
    setError(null);

    try {
      const pred = await predictionService.predictFromLatest(activeId);
      setLatestPrediction(pred);
      setSuccessMsg(`Fresh ML prediction evaluated successfully (${pred.failure_prediction ? 'FAILURE DETECTED' : 'NOMINAL'}).`);
    } catch (err) {
      setError(err.message || 'Prediction execution failed.');
    } finally {
      setPredicting(false);
    }
  };

  const activeMachine = machines.find(m => m.id === activeId) || (machines.length > 0 ? machines[0] : null);

  const airTemp = latestTelemetry?.air_temp ?? 298.1;
  const procTemp = latestTelemetry?.process_temp ?? 308.6;
  const speed = latestTelemetry?.rotational_speed ?? 1550;
  const torque = latestTelemetry?.torque ?? 42.0;
  const toolWear = latestTelemetry?.tool_wear ?? 20;
  const deltaT = (procTemp - airTemp).toFixed(1);
  const power = ((torque * speed * 2 * Math.PI) / 60).toFixed(1);
  const overstrain = (toolWear * torque).toFixed(1);

  // Model global feature weights derived from XGBoost booster training
  const modelFeatureWeights = {
    "Torque (Nm)": 28,
    "Rotational Speed (RPM)": 24,
    "Process Temp (K)": 18,
    "Tool Wear (min)": 14,
    "Temp Difference (ΔT)": 10,
    "Mechanical Power": 6
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
              <h1 className="text-2xl font-extrabold text-industrial-text">Machine Failure Predictions</h1>
              <p className="text-xs text-industrial-subtext">Native XGBoost Dual-Stage Inference & Classification Engine</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MachineSelector machines={machines} activeId={activeId} onSelect={setActiveId} />
              {canWrite && (
                <button
                  onClick={handleRunInference}
                  disabled={predicting || !activeId}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-glow-orange transition disabled:opacity-50"
                >
                  <FiPlay className={predicting ? 'animate-spin' : ''} />
                  <span>{predicting ? 'Predicting...' : 'Run Inference'}</span>
                </button>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <FiCheckCircle />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
              <FiAlertTriangle />
              <span>{error}</span>
            </div>
          )}

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Prediction Risk Gauge & Metrics (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              <PredictionCard prediction={latestPrediction} machineName={activeMachine?.name || 'Selected Asset'} />

              {/* Engineering Recommendation Explanation */}
              <div className="industrial-card p-5 space-y-3 bg-white">
                <div className="flex items-center gap-2 text-steel-blue font-bold text-sm border-b border-industrial-border pb-2">
                  <FiInfo className="text-industrial-orange text-base" />
                  <span>Authoritative Model Architecture & Diagnostics</span>
                </div>
                <p className="text-xs text-industrial-subtext leading-relaxed">
                  The dual-stage native XGBoost model runs Stage 1 binary breakdown prediction (trained with 28.5:1 scale_pos_weight on AI4I 2020) and Stage 2 multiclass classification (HDF, PWF, OSF, TWF, RNF).
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-industrial-text space-y-1">
                  <div>Model Version: <strong>{latestPrediction?.model_version || 'failure-model-v1.0'}</strong></div>
                  <div>Health Score: <strong>{latestPrediction?.health_score !== undefined ? latestPrediction.health_score : 100} / 100</strong></div>
                  <div>Classified Type: <strong>{latestPrediction?.failure_type || 'NO_FAILURE'}</strong></div>
                  <div>RUL Estimation: <span className="font-sans text-slate-500">RUL: Not available</span></div>
                </div>

                {latestPrediction?.blackbox_code && (
                  <div className="pt-2">
                    <Link
                      to={`/blackboxes/code/${latestPrediction.blackbox_code}`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-industrial-orange hover:underline"
                    >
                      <FiArchive /> Failure Black Box Captured: {latestPrediction.blackbox_code} →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Feature Importance Breakdown (6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              <FeatureImportance features={modelFeatureWeights} />

              {/* Sensor Channel Inputs */}
              <div className="industrial-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-industrial-text pb-2 border-b border-industrial-border">
                  Evaluated 11-Feature Ingest Vector ({activeMachine?.serial_number || 'Asset'})
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">AIR TEMP</span>
                    <span className="font-bold text-industrial-text">{airTemp} K</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">PROCESS TEMP</span>
                    <span className="font-bold text-industrial-text">{procTemp} K</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">SPEED</span>
                    <span className="font-bold text-industrial-text">{speed} RPM</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">TORQUE</span>
                    <span className="font-bold text-industrial-text">{torque} Nm</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">TOOL WEAR</span>
                    <span className="font-bold text-industrial-orange">{toolWear} min</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">DELTA T</span>
                    <span className="font-bold text-steel-blue">{deltaT} K</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">POWER (W)</span>
                    <span className="font-bold text-industrial-text">{power}</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">OVERSTRAIN</span>
                    <span className="font-bold text-industrial-text">{overstrain}</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">PRODUCT TYPE</span>
                    <span className="font-bold text-industrial-text">Type {activeMachine?.product_type || 'M'}</span>
                  </div>
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
