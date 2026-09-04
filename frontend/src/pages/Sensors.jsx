import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import SensorChart from '../components/SensorChart';
import MachineSelector from '../components/MachineSelector';
import SensorIndicator from '../components/SensorIndicator';
import { machineService } from '../services/machineService';
import { sensorService } from '../services/sensorService';
import { useAuth } from '../context/AuthContext';
import {
  FiActivity,
  FiThermometer,
  FiSliders,
  FiClock,
  FiZap,
  FiCpu,
  FiPlay,
  FiRefreshCw,
  FiAlertTriangle
} from 'react-icons/fi';

export default function Sensors() {
  const { user, canWrite } = useAuth();
  const [machines, setMachines] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [injecting, setInjecting] = useState(false);

  // Load machines list
  const loadMachines = async () => {
    try {
      const res = await machineService.getMachines();
      const items = res?.items || [];
      setMachines(items);
      if (items.length > 0 && !activeId) {
        setActiveId(items[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch machines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  // Load telemetry for active machine
  const loadTelemetry = async (targetId = activeId) => {
    if (!targetId) return;

    try {
      const [latestRes, histRes] = await Promise.allSettled([
        sensorService.getLatestTelemetry(targetId),
        sensorService.getTelemetryHistory(targetId, { page_size: 50 })
      ]);

      if (latestRes.status === 'fulfilled') {
        setLatestTelemetry(latestRes.value);
      } else {
        setLatestTelemetry(null);
      }

      if (histRes.status === 'fulfilled') {
        setTelemetryHistory(histRes.value?.items || []);
      } else {
        setTelemetryHistory([]);
      }
    } catch (err) {
      console.error('Error fetching sensor history:', err);
    }
  };

  useEffect(() => {
    loadTelemetry(activeId);
  }, [activeId]);

  // Live streaming interval loop
  useEffect(() => {
    let interval = null;
    if (isStreaming && activeId) {
      interval = setInterval(async () => {
        try {
          const basePTemp = latestTelemetry?.process_temp || 308.6;
          const baseATemp = latestTelemetry?.air_temp || 298.1;
          const baseSpeed = latestTelemetry?.rotational_speed || 1550;
          const baseTorque = latestTelemetry?.torque || 42.0;
          const baseToolWear = (latestTelemetry?.tool_wear || 20) + 0.2;

          // Add realistic Gaussian-style physical sensor jitter
          const newPTemp = Number((basePTemp + (Math.random() - 0.48) * 0.4).toFixed(2));
          const newATemp = Number((baseATemp + (Math.random() - 0.48) * 0.2).toFixed(2));
          const newSpeed = Number((baseSpeed + (Math.random() - 0.5) * 15).toFixed(0));
          const newTorque = Number((baseTorque + (Math.random() - 0.5) * 1.2).toFixed(2));
          const newToolWear = Number(baseToolWear.toFixed(1));

          await sensorService.ingestTelemetry(activeId, {
            air_temp: newATemp,
            process_temp: newPTemp,
            rotational_speed: newSpeed,
            torque: newTorque,
            tool_wear: newToolWear
          });

          await loadTelemetry(activeId);
        } catch (err) {
          console.error('Live streaming sensor injection error:', err);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, activeId, latestTelemetry]);

  // Inject single sample reading
  const handleInjectSample = async () => {
    if (!activeId) return;
    setInjecting(true);
    try {
      const pTemp = Number((308.0 + Math.random() * 2.5).toFixed(2));
      const aTemp = Number((298.0 + Math.random() * 1.0).toFixed(2));
      const speed = Number((1520 + Math.random() * 60).toFixed(0));
      const torque = Number((40.0 + Math.random() * 5.0).toFixed(2));
      const toolWear = Number(((latestTelemetry?.tool_wear || 20) + 2).toFixed(1));

      await sensorService.ingestTelemetry(activeId, {
        air_temp: aTemp,
        process_temp: pTemp,
        rotational_speed: speed,
        torque: torque,
        tool_wear: toolWear
      });

      await loadTelemetry(activeId);
    } catch (err) {
      console.error('Sample injection failed:', err);
    } finally {
      setInjecting(false);
    }
  };

  const activeMachine = machines.find(m => m.id === activeId) || (machines.length > 0 ? machines[0] : null);

  const procTemp = latestTelemetry?.process_temp ?? (telemetryHistory[0]?.process_temp ?? 308.6);
  const airTemp = latestTelemetry?.air_temp ?? (telemetryHistory[0]?.air_temp ?? 298.1);
  const speed = latestTelemetry?.rotational_speed ?? (telemetryHistory[0]?.rotational_speed ?? 1550);
  const torque = latestTelemetry?.torque ?? (telemetryHistory[0]?.torque ?? 42.0);
  const toolWear = latestTelemetry?.tool_wear ?? (telemetryHistory[0]?.tool_wear ?? 20);
  const deltaT = (procTemp - airTemp).toFixed(1);
  const power = ((torque * speed * 2 * Math.PI) / 60).toFixed(1);

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-industrial-text">Live Sensor Telemetry & Analytics</h1>
              <p className="text-xs text-industrial-subtext">Multi-channel physical telemetry streams from Cloud Firestore time-series</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MachineSelector machines={machines} activeId={activeId} onSelect={setActiveId} />

              {/* Streaming Toggle Button */}
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
                  isStreaming
                    ? 'bg-emerald-600 text-white shadow-emerald-200 animate-pulse'
                    : 'bg-steel-blue hover:bg-steel-blue-dark text-white'
                }`}
                title={isStreaming ? 'Stop Telemetry Stream' : 'Start Continuous Live Telemetry Stream'}
              >
                <FiPlay className={isStreaming ? 'animate-spin' : ''} />
                <span>{isStreaming ? 'Streaming Live (3s)' : 'Live Telemetry Stream'}</span>
              </button>

              {/* Inject Sample Button */}
              <button
                onClick={handleInjectSample}
                disabled={injecting || !activeId}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                title="Inject a physical sensor sample into Cloud Firestore"
              >
                <FiZap className={injecting ? 'animate-spin' : ''} />
                <span>{injecting ? 'Recording...' : 'Inject Reading'}</span>
              </button>

              <button
                onClick={() => loadTelemetry(activeId)}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                title="Refresh Readings"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* 7 Channels Live Telemetry Readout Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <SensorIndicator
              label="Process Temp"
              value={`${procTemp}`}
              unit="K"
              status={procTemp > 312 ? 'critical' : procTemp > 310 ? 'warning' : 'normal'}
              icon={FiThermometer}
            />

            <SensorIndicator
              label="Air Temp"
              value={`${airTemp}`}
              unit="K"
              status={airTemp > 305 ? 'warning' : 'normal'}
              icon={FiThermometer}
            />

            <SensorIndicator
              label="Rotational Speed"
              value={`${speed}`}
              unit="RPM"
              status={speed < 1350 || speed > 2400 ? 'warning' : 'normal'}
              icon={FiClock}
            />

            <SensorIndicator
              label="Torque"
              value={`${torque}`}
              unit="Nm"
              status={torque > 60 ? 'critical' : torque > 50 ? 'warning' : 'normal'}
              icon={FiSliders}
            />

            <SensorIndicator
              label="Tool Wear"
              value={`${toolWear}`}
              unit="min"
              status={toolWear > 200 ? 'critical' : toolWear > 150 ? 'warning' : 'normal'}
              icon={FiActivity}
            />

            <SensorIndicator
              label="Delta T (ΔT)"
              value={`${deltaT}`}
              unit="K"
              status={deltaT > 13 ? 'critical' : 'normal'}
              icon={FiCpu}
            />

            <SensorIndicator
              label="Mechanical Power"
              value={`${power}`}
              unit="W"
              status={power > 9000 ? 'warning' : 'normal'}
              icon={FiZap}
            />
          </div>

          {/* Real Recharts Line Chart */}
          <SensorChart data={telemetryHistory.length > 0 ? telemetryHistory : (latestTelemetry ? [latestTelemetry] : [])} height={380} />

        </main>
      </div>

      <Footer />
    </div>
  );
}
