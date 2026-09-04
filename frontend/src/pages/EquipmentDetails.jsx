import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import Machine3DViewer from '../components/Machine3DViewer';
import HealthGauge from '../components/HealthGauge';
import RiskBadge from '../components/RiskBadge';
import { machineService } from '../services/machineService';
import { sensorService } from '../services/sensorService';
import { predictionService } from '../services/predictionService';
import { blackboxService } from '../services/blackboxService';
import { useAuth } from '../context/AuthContext';
import { generateMachinePdfReport } from '../utils/pdfReportGenerator';
import {
  FiArrowLeft,
  FiActivity,
  FiZap,
  FiClock,
  FiCpu,
  FiShield,
  FiTool,
  FiSliders,
  FiRefreshCw,
  FiPlay,
  FiArchive,
  FiCheckCircle,
  FiAlertTriangle,
  FiDownload
} from 'react-icons/fi';

export default function EquipmentDetails() {
  const { id } = useParams();
  const { user, canWrite } = useAuth();

  const [machine, setMachine] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [historyTelemetry, setHistoryTelemetry] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [blackboxes, setBlackboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predSuccess, setPredSuccess] = useState('');
  const [predError, setPredError] = useState('');

  // Interactive Live Telemetry Injection Form
  const [airTemp, setAirTemp] = useState(298.1);
  const [processTemp, setProcessTemp] = useState(308.6);
  const [speed, setSpeed] = useState(1550);
  const [torque, setTorque] = useState(42.0);
  const [toolWear, setToolWear] = useState(20);

  const loadData = async (initial = false) => {
    if (initial) setLoading(true);
    setError(null);
    try {
      const [machRes, telRes, histRes, predRes, bbRes] = await Promise.allSettled([
        machineService.getMachineById(id),
        sensorService.getLatestTelemetry(id),
        sensorService.getTelemetryHistory(id, { page_size: 20 }),
        predictionService.getMachinePredictions(id, { page_size: 5 }),
        blackboxService.getMachineBlackBoxes(id, { page_size: 5 })
      ]);

      if (machRes.status === 'fulfilled' && machRes.value) {
        setMachine(machRes.value);
      } else {
        setMachine(null);
        setError('Machine not found in database.');
        return;
      }

      if (telRes.status === 'fulfilled' && telRes.value) {
        setLatestTelemetry(telRes.value);
        if (initial) {
          setAirTemp(telRes.value.air_temp || 298.1);
          setProcessTemp(telRes.value.process_temp || 308.6);
          setSpeed(telRes.value.rotational_speed || 1550);
          setTorque(telRes.value.torque || 42.0);
          setToolWear(telRes.value.tool_wear || 20);
        }
      }

      if (histRes.status === 'fulfilled') {
        setHistoryTelemetry(histRes.value?.items || []);
      }

      if (predRes.status === 'fulfilled' && predRes.value?.items?.length > 0) {
        setLatestPrediction(predRes.value.items[0]);
      }

      if (bbRes.status === 'fulfilled') {
        setBlackboxes(bbRes.value?.items || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load equipment details.');
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [id]);

  // Live Dynamic Sensor Physics & Health Calculator for real-time reactivity
  const livePhysics = React.useMemo(() => {
    const at = Number(airTemp) || 298.1;
    const pt = Number(processTemp) || 308.6;
    const s = Number(speed) || 1550;
    const t = Number(torque) || 42.0;
    const w = Number(toolWear) || 20;

    const deltaTemp = pt - at;
    const power = (t * s * 2 * Math.PI) / 60;
    const overstrain = t * w;

    let failType = 'No Failure';
    let failProb = 0.04;
    let isFail = false;

    if (w >= 240) {
      failType = 'Tool Wear Failure (TWF)';
      failProb = 0.98;
      isFail = true;
    } else if (power > 9000 || (power < 3500 && s > 1000)) {
      failType = 'Power Failure (PWF)';
      failProb = 0.94;
      isFail = true;
    } else if (overstrain > 11000 || (t >= 65 && w >= 180)) {
      failType = 'Overstrain Failure (OSF)';
      failProb = 0.96;
      isFail = true;
    } else if (deltaTemp < 8.6 && s < 1380) {
      failType = 'Heat Dissipation Failure (HDF)';
      failProb = 0.91;
      isFail = true;
    } else if (w > 180 || t > 55 || deltaTemp > 12) {
      failType = 'Degraded Performance';
      failProb = 0.42;
      isFail = false;
    }

    let calculatedHealth = Math.max(0, Math.min(100, Math.round(100 * (1 - failProb))));
    if (w > 180 && !isFail) {
      calculatedHealth = Math.max(25, calculatedHealth - (w - 180) * 0.4);
    }
    if (t > 55 && !isFail) {
      calculatedHealth = Math.max(25, calculatedHealth - (t - 55) * 0.8);
    }

    return {
      health: Math.round(calculatedHealth),
      failureProbability: failProb,
      failureType: failType,
      isFailure: isFail
    };
  }, [airTemp, processTemp, speed, torque, toolWear]);

  const applyPreset = async (preset) => {
    let newAT = airTemp, newPT = processTemp, newS = speed, newT = torque, newW = toolWear;

    if (preset === 'NOMINAL') {
      newAT = 298.1; newPT = 308.6; newS = 1550; newT = 42.0; newW = 20;
    } else if (preset === 'HDF') {
      newAT = 303.0; newPT = 311.5; newS = 1350; newT = 50.0; newW = 80;
    } else if (preset === 'PWF') {
      newAT = 299.0; newPT = 310.0; newS = 1150; newT = 76.0; newW = 110;
    } else if (preset === 'OSF') {
      newAT = 300.0; newPT = 311.0; newS = 1250; newT = 68.0; newW = 220;
    } else if (preset === 'TWF') {
      newAT = 298.0; newPT = 309.0; newS = 1520; newT = 45.0; newW = 245;
    }

    setAirTemp(newAT);
    setProcessTemp(newPT);
    setSpeed(newS);
    setTorque(newT);
    setToolWear(newW);
    setLatestPrediction(null); // instantly reflect live physics

    if (canWrite) {
      try {
        const payload = {
          air_temp: newAT,
          process_temp: newPT,
          rotational_speed: newS,
          torque: newT,
          tool_wear: newW
        };
        await sensorService.ingestTelemetry(id, payload);
        const pred = await predictionService.predictFromTelemetry(id, payload);
        setLatestPrediction(pred);
        const updatedTelemetry = { ...payload, timestamp: new Date().toISOString() };
        setLatestTelemetry(updatedTelemetry);
        setHistoryTelemetry(prev => [updatedTelemetry, ...prev.slice(0, 19)]);
        const bbRes = await blackboxService.getMachineBlackBoxes(id, { page_size: 5 });
        if (bbRes?.items) setBlackboxes(bbRes.items);
      } catch (e) {
        console.error('Preset ML evaluation error:', e);
      }
    }
  };

  // Auto-sync real ML prediction with backend debounce on slider change
  useEffect(() => {
    if (!id || !canWrite || loading) return;

    const timer = setTimeout(async () => {
      try {
        const currentData = {
          air_temp: Number(airTemp),
          process_temp: Number(processTemp),
          rotational_speed: Number(speed),
          torque: Number(torque),
          tool_wear: Number(toolWear)
        };
        const pred = await predictionService.predictFromTelemetry(id, currentData);
        setLatestPrediction(pred);
      } catch (e) {
        // silent fallback
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [airTemp, processTemp, speed, torque, toolWear, id]);

  const handleRunPrediction = async (e) => {
    e?.preventDefault();
    if (!canWrite) return;
    setPredicting(true);
    setPredSuccess('');
    setPredError('');

    const currentData = {
      air_temp: Number(airTemp),
      process_temp: Number(processTemp),
      rotational_speed: Number(speed),
      torque: Number(torque),
      tool_wear: Number(toolWear)
    };

    try {
      // 1. Ingest updated telemetry values to Flask backend
      const ingested = await sensorService.ingestTelemetry(id, currentData);
      
      // 2. Run real XGBoost prediction on the exact telemetry
      const pred = await predictionService.predictFromTelemetry(id, currentData);
      
      // 3. Immediately update UI state with response
      const updatedTelemetry = ingested || { ...currentData, timestamp: new Date().toISOString() };
      setLatestTelemetry(updatedTelemetry);
      setLatestPrediction(pred);
      setPredSuccess(
        `ML inference executed: ${pred.failure_prediction ? '⚠️ CRITICAL FAILURE TRIGGERED (' + (pred.failure_type || 'FAILURE') + ')' : '✅ NOMINAL HEALTHY CONDITION'} (Health: ${Math.round(pred.health_score || 0)}%)`
      );

      // 4. Prepend to history for real-time chart update
      setHistoryTelemetry(prev => [updatedTelemetry, ...prev.slice(0, 19)]);

      // 5. Refresh blackbox list if an incident was generated
      const bbRes = await blackboxService.getMachineBlackBoxes(id, { page_size: 5 });
      if (bbRes?.items) {
        setBlackboxes(bbRes.items);
      }
    } catch (err) {
      setPredError(err.message || 'Prediction execution failed.');
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
            <p className="text-sm font-semibold text-industrial-subtext">Loading Equipment Details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto p-8 flex items-center justify-center">
          <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 space-y-3 w-full">
            <div className="flex items-center gap-2 font-bold text-base">
              <FiAlertTriangle className="text-xl" />
              <span>Equipment Record Not Found</span>
            </div>
            <p className="text-xs">{error || 'Unable to locate machine in database.'}</p>
            <Link to="/equipment" className="inline-flex items-center gap-1.5 text-xs font-bold text-steel-blue hover:underline pt-2">
              <FiArrowLeft /> Return to Equipment Catalog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentHealth = latestPrediction?.health_score !== undefined
    ? latestPrediction.health_score
    : livePhysics.health;

  const currentFailProb = latestPrediction?.failure_probability !== undefined
    ? latestPrediction.failure_probability
    : livePhysics.failureProbability;

  const currentFailType = latestPrediction?.failure_type || livePhysics.failureType;

  const riskLevel =
    currentHealth >= 75 ? 'LOW' :
    currentHealth >= 50 ? 'MEDIUM' :
    currentHealth >= 25 ? 'HIGH' : 'CRITICAL';

  const computedStatus =
    currentHealth >= 75 ? 'HEALTHY' :
    currentHealth >= 50 ? 'WARNING' : 'CRITICAL';

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Top Breadcrumb & Machine Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm">
            <div>
              <Link to="/equipment" className="inline-flex items-center gap-1 text-xs font-bold text-steel-blue hover:text-industrial-orange transition mb-2">
                <FiArrowLeft /> Back to Equipment Catalog
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-industrial-text font-mono">
                  {machine.serial_number || machine.id}
                </h1>
                <RiskBadge level={riskLevel} />
                <span className="text-xs font-semibold text-industrial-subtext px-2.5 py-0.5 rounded bg-industrial-gray border border-industrial-border">
                  {computedStatus}
                </span>
              </div>
              <p className="text-xs text-industrial-subtext mt-1">
                {machine.name} • Location: {machine.location || 'Main Factory'} • Grade: Type {machine.product_type || 'M'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-l border-industrial-border pl-6">
              <HealthGauge value={Math.round(currentHealth)} size={80} strokeWidth={8} />
              <div>
                <span className="text-[10px] font-bold uppercase text-industrial-subtext block">FAILURE PROBABILITY</span>
                <span className={`text-2xl font-extrabold font-mono ${currentFailProb > 0.5 ? 'text-red-600' : currentFailProb > 0.25 ? 'text-industrial-orange' : 'text-emerald-600'}`}>
                  {(currentFailProb * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">XGBoost Native AI Engine</span>
              </div>

              <button
                onClick={() => generateMachinePdfReport({
                  machine,
                  latestTelemetry,
                  latestPrediction,
                  historyTelemetry,
                  blackboxes,
                  user
                })}
                className="ml-2 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white text-xs font-bold transition shadow-sm hover:shadow-glow-blue cursor-pointer"
                title="Download ISO 13374 Diagnostic PDF Report"
              >
                <FiDownload className="text-sm text-industrial-orange" />
                <span>Download PDF Report</span>
              </button>
            </div>
          </div>

          {predSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <FiCheckCircle />
              <span>{predSuccess}</span>
            </div>
          )}

          {predError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <FiAlertTriangle className="text-red-600 flex-shrink-0" />
              <span>{predError}</span>
            </div>
          )}

          {/* Main 3D & Prediction Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 3D Viewer (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-industrial-text">Interactive 3D Digital Twin Viewer</h2>
                <span className="text-xs font-mono text-industrial-subtext">3D CAD Model: CNC-Center-v4</span>
              </div>
              
              <Machine3DViewer machineData={{
                ...machine,
                health: currentHealth,
                temperature: Math.round((Number(processTemp) || 308.6) - 273.15),
                vibration: ((Number(torque) || 42) / 15.0).toFixed(1),
                pressure: ((Number(speed) || 1550) / 300.0).toFixed(1),
                current: ((Number(toolWear) || 20) / 10.0 + 10).toFixed(1)
              }} height="h-[480px]" />
            </div>

            {/* Right Health & Telemetry Injection (5 Cols) */}
            <div className="lg:col-span-5 industrial-card p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="pb-2 border-b border-industrial-border">
                  <h3 className="text-base font-bold text-industrial-text">Machine Condition & Diagnostics</h3>
                  <p className="text-xs text-industrial-subtext">Authoritative XGBoost Classification & Stress Testing</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 my-3">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Classified Condition</span>
                    <span className={`font-extrabold text-sm ${currentFailType !== 'No Failure' && currentFailType !== 'NO_FAILURE' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {currentFailType}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Health Index</span>
                    <span className="font-extrabold text-steel-blue text-sm font-mono">
                      {Math.round(currentHealth)} / 100
                    </span>
                  </div>
                </div>

                {/* Quick Stress Failure Presets */}
                <div className="space-y-1.5 pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1-Click Failure Stress Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset('NOMINAL')}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded border border-emerald-200 transition"
                    >
                      🌱 Healthy
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('HDF')}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded border border-amber-200 transition"
                      title="Heat Dissipation Failure (High Process Temp vs Air Temp)"
                    >
                      🔥 Thermal (HDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('PWF')}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold rounded border border-purple-200 transition"
                      title="Power Failure (Extreme Torque Load)"
                    >
                      ⚡ Power (PWF)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('OSF')}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded border border-rose-200 transition"
                      title="Overstrain Failure (Torque + Tool Wear)"
                    >
                      ⚙️ Overstrain (OSF)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('TWF')}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded border border-red-200 transition"
                      title="Tool Wear Failure (>240 min wear)"
                    >
                      🔪 Tool Wear (TWF)
                    </button>
                  </div>
                </div>

                {/* Telemetry Injection 5-Channel Slider Controls */}
                <form onSubmit={handleRunPrediction} className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-steel-blue">
                    <span>Live 5-Channel Sensor Controls</span>
                    <FiSliders />
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Air Temperature */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Air Temp: <strong>{airTemp} K</strong> ({(airTemp - 273.15).toFixed(1)}°C)</span>
                        <span className="text-slate-400">Nominal: ~298.1K</span>
                      </div>
                      <input
                        type="range"
                        min="293"
                        max="315"
                        step="0.1"
                        disabled={!canWrite}
                        value={airTemp}
                        onChange={(e) => setAirTemp(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50"
                      />
                    </div>

                    {/* Process Temperature */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Process Temp: <strong>{processTemp} K</strong> ({(processTemp - 273.15).toFixed(1)}°C)</span>
                        <span className="text-slate-400">Nominal: ~308.6K</span>
                      </div>
                      <input
                        type="range"
                        min="295"
                        max="325"
                        step="0.1"
                        disabled={!canWrite}
                        value={processTemp}
                        onChange={(e) => setProcessTemp(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50"
                      />
                    </div>

                    {/* Rotational Speed */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Rotational Speed: <strong>{speed} RPM</strong></span>
                        <span className="text-slate-400">Nominal: ~1550 RPM</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="3000"
                        step="10"
                        disabled={!canWrite}
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50"
                      />
                    </div>

                    {/* Torque */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Torque: <strong>{torque} Nm</strong></span>
                        <span className="text-slate-400">Nominal: ~40Nm</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        step="0.5"
                        disabled={!canWrite}
                        value={torque}
                        onChange={(e) => setTorque(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50"
                      />
                    </div>

                    {/* Tool Wear */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Tool Wear: <strong>{toolWear} min</strong></span>
                        <span className="text-slate-400">Limit: ~240min</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="260"
                        step="1"
                        disabled={!canWrite}
                        value={toolWear}
                        onChange={(e) => setToolWear(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-industrial-orange disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {canWrite ? (
                    <button
                      type="submit"
                      disabled={predicting}
                      className="w-full mt-2 py-2.5 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:shadow-glow-orange transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <FiPlay className={predicting ? 'animate-spin' : ''} />
                      <span>{predicting ? 'Evaluating ML Model...' : '⚡ Ingest & Run Prediction'}</span>
                    </button>
                  ) : (
                    <div className="w-full mt-2 py-2 px-3 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg text-center">
                      Client View Mode: Telemetry & Ingestion is Read-Only
                    </div>
                  )}
                </form>
              </div>

              <div className="pt-2.5 border-t border-industrial-border text-xs text-industrial-subtext flex justify-between">
                <span>Assigned: <strong className="text-industrial-text">{machine.assigned_engineer?.full_name || 'Unassigned'}</strong></span>
                <span className="font-mono">{machine.product_type} Grade</span>
              </div>
            </div>

          </div>

          {/* Black Box Incidents for this Machine */}
          <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider flex items-center gap-2">
                <FiArchive className="text-industrial-orange" />
                Failure Black Box Incidents for this Equipment ({blackboxes.length})
              </h3>
              <Link to="/blackboxes" className="text-xs font-bold text-steel-blue hover:underline">
                View All Incidents
              </Link>
            </div>

            {blackboxes.length === 0 ? (
              <p className="text-xs text-industrial-subtext">No failure black box records captured for this asset.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {blackboxes.map((bb) => (
                  <div key={bb.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-steel-blue text-xs mr-3">{bb.blackbox_code}</span>
                      <span className="text-xs font-bold text-red-600 mr-3">{bb.failure_summary?.failure_type}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {bb.failure_timestamp ? new Date(bb.failure_timestamp).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <Link
                      to={`/blackboxes/${bb.id}`}
                      className="text-xs font-bold text-white bg-steel-blue hover:bg-steel-blue-dark px-3 py-1 rounded transition"
                    >
                      Inspect Evidence
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>

      <Footer />
    </div>
  );
}
