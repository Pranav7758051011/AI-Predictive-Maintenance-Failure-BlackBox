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
  FiAlertTriangle
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

  // Interactive Live Telemetry Injection Form
  const [airTemp, setAirTemp] = useState(298.1);
  const [processTemp, setProcessTemp] = useState(308.6);
  const [speed, setSpeed] = useState(1550);
  const [torque, setTorque] = useState(42.0);
  const [toolWear, setToolWear] = useState(20);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [machRes, telRes, histRes, predRes, bbRes] = await Promise.allSettled([
        machineService.getMachineById(id),
        sensorService.getLatestTelemetry(id),
        sensorService.getTelemetryHistory(id, { page_size: 20 }),
        predictionService.getMachinePredictions(id, { page_size: 5 }),
        blackboxService.getMachineBlackBoxes(id, { page_size: 5 })
      ]);

      if (machRes.status === 'fulfilled') {
        setMachine(machRes.value);
      } else {
        throw new Error('Machine not found in database.');
      }

      if (telRes.status === 'fulfilled' && telRes.value) {
        setLatestTelemetry(telRes.value);
        setAirTemp(telRes.value.air_temp || 298.1);
        setProcessTemp(telRes.value.process_temp || 308.6);
        setSpeed(telRes.value.rotational_speed || 1550);
        setTorque(telRes.value.torque || 42.0);
        setToolWear(telRes.value.tool_wear || 20);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRunPrediction = async (e) => {
    e?.preventDefault();
    if (!canWrite) return;
    setPredicting(true);
    setPredSuccess('');

    try {
      // 1. Ingest updated telemetry values to Flask
      await sensorService.ingestTelemetry(id, {
        air_temp: Number(airTemp),
        process_temp: Number(processTemp),
        rotational_speed: Number(speed),
        torque: Number(torque),
        tool_wear: Number(toolWear)
      });

      // 2. Run real XGBoost prediction
      const pred = await predictionService.predictFromLatest(id);
      setLatestPrediction(pred);
      setPredSuccess(`ML inference executed (${pred.failure_prediction ? 'CRITICAL FAILURE TRIGGERED' : 'NOMINAL CONDITION'}).`);

      // Refresh data
      await loadData();
    } catch (err) {
      setError(err.message || 'Prediction execution failed.');
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

  if (error || !machine) {
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
    : (machine.current_health_score ?? 100);

  const riskLevel =
    currentHealth >= 75 ? 'LOW' :
    currentHealth >= 50 ? 'MEDIUM' :
    currentHealth >= 25 ? 'HIGH' : 'CRITICAL';

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
                  {machine.status || 'HEALTHY'}
                </span>
              </div>
              <p className="text-xs text-industrial-subtext mt-1">
                {machine.name} • Location: {machine.location || 'Main Factory'} • Grade: Type {machine.product_type || 'M'}
              </p>
            </div>

            <div className="flex items-center gap-4 border-l border-industrial-border pl-6">
              <HealthGauge value={Math.round(currentHealth)} size={80} strokeWidth={8} />
              <div>
                <span className="text-[10px] font-bold uppercase text-industrial-subtext block">FAILURE PROBABILITY</span>
                <span className="text-2xl font-extrabold font-mono text-industrial-orange">
                  {latestPrediction?.failure_probability ? `${(latestPrediction.failure_probability * 100).toFixed(1)}%` : '4.0%'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">XGBoost Native AI Engine</span>
              </div>
            </div>
          </div>

          {predSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <FiCheckCircle />
              <span>{predSuccess}</span>
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
                temperature: Math.round((latestTelemetry?.process_temp || 308.6) - 273.15),
                vibration: ((latestTelemetry?.torque || 42) / 15.0).toFixed(1),
                pressure: ((latestTelemetry?.rotational_speed || 1550) / 300.0).toFixed(1),
                current: ((latestTelemetry?.tool_wear || 20) / 10.0 + 10).toFixed(1)
              }} height="h-[480px]" />
            </div>

            {/* Right Health & Telemetry Injection (5 Cols) */}
            <div className="lg:col-span-5 industrial-card p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-industrial-border">
                  <h3 className="text-base font-bold text-industrial-text">Machine Condition & Diagnostics</h3>
                  <p className="text-xs text-industrial-subtext">Authoritative XGBoost Classification & Condition Assessment</p>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Classified Failure</span>
                    <span className="font-extrabold text-red-600 text-sm">
                      {latestPrediction?.failure_type || 'NO_FAILURE'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining Useful Life</span>
                    <span className="font-medium text-slate-500 text-xs">
                      RUL: Not available
                    </span>
                  </div>
                </div>

                {/* Telemetry Injection Slider Controls */}
                <form onSubmit={handleRunPrediction} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-steel-blue">
                    <span>Live Sensor Control & Stress Injection</span>
                    <FiSliders />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Process Temp: <strong>{processTemp} K</strong></span>
                        <span className="text-slate-400">Nominal: ~308K</span>
                      </div>
                      <input
                        type="range"
                        min="295"
                        max="325"
                        step="0.1"
                        disabled={!canWrite}
                        value={processTemp}
                        onChange={(e) => setProcessTemp(e.target.value)}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

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
                        onChange={(e) => setTorque(e.target.value)}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-steel-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

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
                        onChange={(e) => setToolWear(e.target.value)}
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-industrial-orange disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {canWrite ? (
                    <button
                      type="submit"
                      disabled={predicting}
                      className="w-full mt-3 py-2.5 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:shadow-glow-orange transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiPlay className={predicting ? 'animate-spin' : ''} />
                      <span>{predicting ? 'Evaluating ML Model...' : 'Ingest & Run Prediction'}</span>
                    </button>
                  ) : (
                    <div className="w-full mt-3 py-2 px-3 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg text-center">
                      Client View Mode: Telemetry & Ingestion is Read-Only
                    </div>
                  )}
                </form>
              </div>

              <div className="pt-3 border-t border-industrial-border text-xs text-industrial-subtext flex justify-between">
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
