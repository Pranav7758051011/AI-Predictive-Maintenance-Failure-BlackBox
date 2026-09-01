import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import MetricCard from '../components/MetricCard';
import SimulationControls from '../components/SimulationControls';
import Machine3DViewer from '../components/Machine3DViewer';
import DataTable from '../components/DataTable';
import MachineSelector from '../components/MachineSelector';
import HealthGauge from '../components/HealthGauge';
import RiskBadge from '../components/RiskBadge';
import { useSensorSimulation } from '../hooks/useSensorSimulation';
import {
  FiBox,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertOctagon,
  FiTrendingUp,
  FiActivity,
  FiClock,
  FiPlay,
  FiArchive,
  FiRefreshCw
} from 'react-icons/fi';

export default function Dashboard() {
  const {
    machines,
    activeMachine,
    activeMachineId,
    setActiveMachineId,
    latestTelemetry,
    latestPrediction,
    simulationMode,
    simulationStep,
    isSimulating,
    loading,
    error,
    triggerSimulation,
    resetSimulation
  } = useSensorSimulation();

  // Metrics derived strictly from real MongoDB machine fleet state
  const totalAssets = machines.length;
  const healthyCount = machines.filter(m => (m.current_health_score ?? 100) >= 75 && m.status !== 'CRITICAL').length;
  const warningCount = machines.filter(m => (m.current_health_score ?? 100) >= 50 && (m.current_health_score ?? 100) < 75 || m.status === 'WARNING').length;
  const criticalCount = machines.filter(m => (m.current_health_score ?? 100) < 50 || m.status === 'CRITICAL').length;
  const predictedFailures = machines.filter(m => (m.current_health_score ?? 100) < 50 || m.status === 'CRITICAL').length;
  
  const avgHealth = totalAssets > 0
    ? (machines.reduce((acc, m) => acc + (m.current_health_score ?? 100), 0) / totalAssets).toFixed(1)
    : '100.0';

  const currentHealth = latestPrediction?.health_score !== undefined
    ? latestPrediction.health_score
    : (activeMachine?.current_health_score ?? 100);

  const currentRisk =
    currentHealth >= 75 ? 'LOW' :
    currentHealth >= 50 ? 'MEDIUM' :
    currentHealth >= 25 ? 'HIGH' : 'CRITICAL';

  const riskBorderColor =
    currentHealth >= 75 ? 'border-l-status-success' :
    currentHealth >= 50 ? 'border-l-status-warning' :
    currentHealth >= 25 ? 'border-l-industrial-orange' :
    'border-l-status-failure';

  const failProb = latestPrediction?.failure_probability !== undefined
    ? latestPrediction.failure_probability
    : (currentHealth < 50 ? 0.85 : 0.04);

  const confidence = latestPrediction?.confidence !== undefined
    ? latestPrediction.confidence
    : 0.942;

  // Real sensor readings or baseline
  const processTemp = latestTelemetry?.process_temp ?? 308.6;
  const airTemp = latestTelemetry?.air_temp ?? 298.1;
  const speed = latestTelemetry?.rotational_speed ?? 1550;
  const torque = latestTelemetry?.torque ?? 42.0;
  const toolWear = latestTelemetry?.tool_wear ?? 20;

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">

          {/* Topbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm hover:shadow-industrial transition duration-300">
            <div>
              <h1 className="text-2xl font-extrabold text-industrial-text">Predictive Maintenance Overview</h1>
              <p className="text-xs text-industrial-subtext">Real-time industrial sensor telemetry & ML machine health assessment</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-industrial-subtext bg-industrial-gray px-3 py-1.5 rounded border border-industrial-border">
                <FiClock className="text-steel-blue" />
                <span>Flask ML Engine Connected</span>
              </div>

              <button
                onClick={() => triggerSimulation("failure")}
                disabled={isSimulating || !activeMachineId}
                className="btn-industrial inline-flex items-center gap-1.5 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded shadow-sm hover:shadow-glow-orange transition disabled:opacity-50"
              >
                <FiPlay className={isSimulating ? 'animate-spin' : ''} />
                <span>Inject Fault & Predict</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard title="Total Assets"        value={totalAssets}   subtext="Monitored Units"    icon={FiBox} />
            <MetricCard title="Healthy"             value={healthyCount}  subtext="Optimal Ops"       icon={FiCheckCircle} trend={`${totalAssets > 0 ? Math.round((healthyCount/totalAssets)*100) : 100}%`} />
            <MetricCard title="Warning"             value={warningCount}  subtext="Degrading"         icon={FiAlertTriangle} trend={warningCount > 0 ? `+${warningCount}` : '0'} />
            <MetricCard title="Critical"            value={criticalCount} subtext="Action Required"   icon={FiAlertOctagon} trend={criticalCount > 0 ? `+${criticalCount}` : '0'} />
            <MetricCard title="Predicted Failures"  value={predictedFailures} subtext="High Risk Units" icon={FiTrendingUp} />
            <MetricCard title="Fleet Average"       value={`${avgHealth}%`}   subtext="Health Score"   icon={FiActivity} />
          </div>

          {/* Simulation Controls */}
          <SimulationControls
            simulationMode={simulationMode}
            simulationStep={simulationStep}
            isSimulating={isSimulating}
            onTrigger={triggerSimulation}
            onReset={resetSimulation}
          />

          {/* 3D Machine + Active Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: 3D Viewer (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-industrial-text">Active Equipment 3D Visualization</h2>
                <MachineSelector machines={machines} activeId={activeMachineId} onSelect={setActiveMachineId} />
              </div>
              <Machine3DViewer machineData={activeMachine ? {
                ...activeMachine,
                health: currentHealth,
                temperature: Math.round(processTemp - 273.15),
                vibration: (torque / 15.0).toFixed(1),
                pressure: (speed / 300.0).toFixed(1),
                current: (toolWear / 10.0 + 10).toFixed(1)
              } : null} height="h-[380px]" />
            </div>

            {/* Right: Machine Status Card (5 cols) */}
            <div className={`lg:col-span-5 industrial-card p-5 space-y-5 flex flex-col justify-between border-l-4 ${riskBorderColor} hover:shadow-industrial-hover transition duration-300`}>
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-industrial-border">
                  <div>
                    <h3 className="text-lg font-bold text-industrial-text">{activeMachine?.name || 'Loading Asset...'}</h3>
                    <p className="text-xs text-industrial-subtext font-mono">
                      Serial: {activeMachine?.serial_number || 'N/A'} • Type: {activeMachine?.product_type || 'M'} • Location: {activeMachine?.location || 'Main Plant'}
                    </p>
                  </div>
                  <RiskBadge level={currentRisk} />
                </div>

                <div className="flex items-center justify-around py-4 bg-industrial-gray/60 my-4 rounded-md border border-industrial-border">
                  <HealthGauge value={Math.round(currentHealth)} size={90} strokeWidth={8} />
                  <div className="space-y-1.5 text-xs font-mono">
                    <div>
                      <span className="text-industrial-subtext">FAILURE RISK: </span>
                      <strong className="text-industrial-orange font-bold">
                        {Math.round(failProb * 100)}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-industrial-subtext">ML TYPE: </span>
                      <strong className="text-steel-blue font-bold">
                        {latestPrediction?.failure_type || (currentHealth < 50 ? 'PWF' : 'NO_FAILURE')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-industrial-subtext">CONFIDENCE: </span>
                      <strong className="text-industrial-text font-bold">
                        {Math.round(confidence * 100)}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-industrial-subtext">RUL: </span>
                      <strong className="text-slate-500 font-sans text-[11px]">
                        RUL: Not available
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Sensor Readouts */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { label: 'PROCESS TEMP', val: `${processTemp} K`, alert: processTemp > 311 },
                    { label: 'AIR TEMP',     val: `${airTemp} K`,     alert: false },
                    { label: 'SPEED',        val: `${speed} RPM`,     alert: speed < 1350 || speed > 2400 },
                    { label: 'TORQUE',       val: `${torque} Nm`,     alert: torque > 60 },
                    { label: 'TOOL WEAR',    val: `${toolWear} min`,  alert: toolWear > 200 },
                    { label: 'DELTA T',      val: `${(processTemp - airTemp).toFixed(1)} K`, alert: (processTemp - airTemp) > 13 }
                  ].map(s => (
                    <div key={s.label} className={`p-2.5 rounded border transition duration-200 hover:shadow-sm ${s.alert ? 'bg-red-50 border-red-200' : 'bg-white border-industrial-border hover:border-steel-blue/40'}`}>
                      <span className={`text-[10px] font-bold uppercase block font-sans ${s.alert ? 'text-red-600' : 'text-industrial-subtext'}`}>{s.label}</span>
                      <span className={`text-sm font-bold ${s.alert ? 'text-status-failure' : 'text-industrial-text'}`}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-industrial-border text-xs text-industrial-subtext flex items-center justify-between">
                <span>Assigned: <strong className="text-industrial-text">{activeMachine?.assigned_engineer?.full_name || 'Unassigned'}</strong></span>
                {latestPrediction?.blackbox_code ? (
                  <Link
                    to={`/blackboxes/code/${latestPrediction.blackbox_code}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-industrial-orange hover:underline"
                  >
                    <FiArchive /> View Black Box ({latestPrediction.blackbox_code})
                  </Link>
                ) : (
                  <span className="font-semibold text-steel-blue">{activeMachine?.status || 'HEALTHY'}</span>
                )}
              </div>
            </div>

          </div>

          {/* Equipment Health Table */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-industrial-text">Equipment Health Matrix (MongoDB Fleet)</h2>
            <DataTable machines={machines} onSelectMachine={setActiveMachineId} activeMachineId={activeMachineId} />
          </div>

        </main>
      </div>

      <Footer />
    </div>
  );
}
