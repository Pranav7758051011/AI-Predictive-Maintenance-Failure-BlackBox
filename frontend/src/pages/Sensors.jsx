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

  // Load machines list
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

  // Load telemetry for active machine
  useEffect(() => {
    if (!activeId) return;

    async function loadTelemetry() {
      try {
        const [latestRes, histRes] = await Promise.allSettled([
          sensorService.getLatestTelemetry(activeId),
          sensorService.getTelemetryHistory(activeId, { page_size: 50 })
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
    }

    loadTelemetry();
  }, [activeId]);

  const activeMachine = machines.find(m => m.id === activeId) || (machines.length > 0 ? machines[0] : null);

  const procTemp = latestTelemetry?.process_temp ?? 308.6;
  const airTemp = latestTelemetry?.air_temp ?? 298.1;
  const speed = latestTelemetry?.rotational_speed ?? 1550;
  const torque = latestTelemetry?.torque ?? 42.0;
  const toolWear = latestTelemetry?.tool_wear ?? 20;
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
              <p className="text-xs text-industrial-subtext">Multi-channel physical telemetry streams from MongoDB time-series collection</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MachineSelector machines={machines} activeId={activeId} onSelect={setActiveId} />
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
          <SensorChart data={telemetryHistory} height={380} />

        </main>
      </div>

      <Footer />
    </div>
  );
}
