import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import AnomalyTimeline from '../components/AnomalyTimeline';
import MetricCard from '../components/MetricCard';
import { predictionService } from '../services/predictionService';
import { blackboxService } from '../services/blackboxService';
import { machineService } from '../services/machineService';
import { FiAlertTriangle, FiCheckCircle, FiShield, FiActivity, FiRefreshCw } from 'react-icons/fi';

export default function Anomalies() {
  const [predictions, setPredictions] = useState([]);
  const [blackboxes, setBlackboxes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, bbRes, machRes] = await Promise.all([
        predictionService.listPredictions({ page_size: 50 }),
        blackboxService.listBlackBoxes({ page_size: 50 }),
        machineService.getMachines()
      ]);

      setPredictions(predRes?.items || []);
      setBlackboxes(bbRes?.items || []);
      setMachines(machRes?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load anomaly data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const machineMap = Object.fromEntries(machines.map(m => [m.id, m]));

  // Build anomaly event items from predictions & black boxes
  const anomalyEvents = predictions
    .filter(p => p.failure_prediction || (p.health_score !== undefined && p.health_score < 75))
    .map(p => {
      const mach = machineMap[p.machine_id] || {};
      const bb = blackboxes.find(b => b.blackbox_code === p.blackbox_code);
      const isCritical = p.failure_prediction || (p.health_score !== undefined && p.health_score < 50);

      return {
        id: p.id,
        time: p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : 'N/A',
        title: p.failure_prediction
          ? `ML Breakdown Detected: ${p.failure_type || 'FAILURE'}`
          : `Sensor Telemetry Degradation (Health ${Math.round(p.health_score || 70)}%)`,
        detail: `XGBoost model evaluated failure probability at ${((p.failure_probability || 0) * 100).toFixed(1)}% with ${((p.confidence || 0.95) * 100).toFixed(1)}% confidence.`,
        severity: isCritical ? 'HIGH' : 'MEDIUM',
        machine: mach.serial_number || mach.name || p.machine_id,
        blackbox_id: bb?.id || null,
        blackbox_code: p.blackbox_code || null
      };
    });

  const highSeverityCount = anomalyEvents.filter(e => e.severity === 'HIGH').length;
  const medSeverityCount = anomalyEvents.filter(e => e.severity === 'MEDIUM').length;
  const totalCount = anomalyEvents.length;

  const totalPredictions = predictions.length || 1;
  const normalPercentage = (((totalPredictions - highSeverityCount) / totalPredictions) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-industrial-text">ML Anomaly & Degradation Analysis</h1>
              <p className="text-xs text-industrial-subtext">Active anomaly events surfaced from MongoDB predictions and sealed Failure Black Boxes</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-industrial-gray border border-industrial-border text-xs font-mono font-bold text-steel-blue">
                <FiShield className="text-industrial-orange" />
                <span>XGBoost ML Pipeline Online</span>
              </div>

              <button
                onClick={loadData}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Anomaly Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Total Anomalies"
              value={totalCount}
              subtext="Surfaced Inferences"
              icon={FiAlertTriangle}
            />

            <MetricCard
              title="Critical Severity"
              value={highSeverityCount}
              subtext="Imminent Failures"
              icon={FiAlertTriangle}
              trend={highSeverityCount > 0 ? `+${highSeverityCount}` : '0'}
            />

            <MetricCard
              title="Degraded Drift"
              value={medSeverityCount}
              subtext="Warning Threshold"
              icon={FiActivity}
            />

            <MetricCard
              title="Normal Baseline"
              value={`${normalPercentage}%`}
              subtext="Fleet Integrity"
              icon={FiCheckCircle}
            />
          </div>

          {/* Timeline Event Log */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-3">
              <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
              <p className="text-sm font-semibold text-industrial-subtext">Loading anomaly events from database...</p>
            </div>
          ) : (
            <AnomalyTimeline events={anomalyEvents} />
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
