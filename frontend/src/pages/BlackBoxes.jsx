import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { blackboxService } from '../services/blackboxService';
import { machineService } from '../services/machineService';
import { useAuth } from '../context/AuthContext';
import {
  FiShield,
  FiArchive,
  FiPlay,
  FiEye,
  FiClock,
  FiAlertTriangle,
  FiFilter,
  FiRefreshCw,
  FiActivity,
  FiCheckCircle
} from 'react-icons/fi';

export default function BlackBoxes() {
  const { user, canWrite } = useAuth();
  const [blackboxes, setBlackboxes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');

  // Filters
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedFailureType, setSelectedFailureType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bbRes, machRes] = await Promise.all([
        blackboxService.listBlackBoxes({
          machine_id: selectedMachine || undefined,
          failure_type: selectedFailureType || undefined,
          incident_status: selectedStatus || undefined
        }),
        machineService.getMachines()
      ]);

      setBlackboxes(bbRes?.items || []);
      setMachines(machRes?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load Black Box records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMachine, selectedFailureType, selectedStatus]);

  const handleSimulateFailure = async () => {
    setSimulating(true);
    setError(null);
    setSimSuccess('');
    try {
      const targetMachineId = selectedMachine || (machines.length > 0 ? machines[0].id : null);
      const res = await blackboxService.simulateFailureBlackBox(targetMachineId);
      setSimSuccess(`Failure Black Box '${res.blackbox_code}' successfully generated and sealed with 24h telemetry window.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="p-2 bg-steel-blue/10 text-steel-blue rounded-lg">
                  <FiArchive className="text-xl text-industrial-orange" />
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-industrial-text">
                  Failure Black Box Incidents
                </h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-industrial-orange/10 text-industrial-orange border border-industrial-orange/20">
                  Immutable Evidence
                </span>
              </div>
              <p className="text-xs text-industrial-subtext">
                Forensic aviation-inspired 24-hour telemetry snapshots, prediction degradation trajectories, and interactive time-series replay.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSimulateFailure}
                disabled={simulating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold transition shadow-md hover:shadow-glow-orange cursor-pointer disabled:opacity-50"
                title="Generate an authentic Failure Black Box incident with degraded telemetry"
              >
                <FiPlay className={simulating ? 'animate-spin' : ''} />
                <span>{simulating ? 'Simulating Incident...' : '⚡ Simulate Failure & Generate Black Box'}</span>
              </button>

              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-300"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {simSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
              <FiCheckCircle className="text-lg text-emerald-600 shrink-0" />
              <span className="font-semibold">{simSuccess}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-industrial-border shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              <FiFilter /> Filters:
            </div>

            {/* Machine Filter */}
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-industrial-border rounded-lg text-xs font-medium text-industrial-text focus:outline-none focus:ring-2 focus:ring-steel-blue"
            >
              <option value="">All Machines ({machines.length})</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.serial_number})
                </option>
              ))}
            </select>

            {/* Failure Type Filter */}
            <select
              value={selectedFailureType}
              onChange={(e) => setSelectedFailureType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-industrial-border rounded-lg text-xs font-medium text-industrial-text focus:outline-none focus:ring-2 focus:ring-steel-blue"
            >
              <option value="">All Failure Types</option>
              <option value="HDF">Heat Dissipation Failure (HDF)</option>
              <option value="PWF">Power Failure (PWF)</option>
              <option value="OSF">Overstrain Failure (OSF)</option>
              <option value="TWF">Tool Wear Failure (TWF)</option>
              <option value="RNF">Random Failure (RNF)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-industrial-border rounded-lg text-xs font-medium text-industrial-text focus:outline-none focus:ring-2 focus:ring-steel-blue"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            {(selectedMachine || selectedFailureType || selectedStatus) && (
              <button
                onClick={() => {
                  setSelectedMachine('');
                  setSelectedFailureType('');
                  setSelectedStatus('');
                }}
                className="text-xs text-industrial-orange hover:underline font-semibold ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-3">
              <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
              <p className="text-sm font-semibold text-industrial-subtext">Loading Failure Black Box incidents from MongoDB...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 text-sm flex items-center gap-3">
              <FiAlertTriangle className="text-xl shrink-0" />
              <span>{error}</span>
            </div>
          ) : blackboxes.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                <FiShield />
              </div>
              <h3 className="text-lg font-bold text-industrial-text">No Failure Black Boxes Recorded</h3>
              <p className="text-xs text-industrial-subtext max-w-md mx-auto">
                No failure incidents match the selected criteria. You can test and inspect the Failure Black Box system now by simulating an authentic failure incident.
              </p>
              <button
                onClick={handleSimulateFailure}
                disabled={simulating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-bold transition shadow-md hover:shadow-glow-orange mx-auto cursor-pointer disabled:opacity-50"
              >
                <FiPlay className={simulating ? 'animate-spin' : ''} />
                <span>{simulating ? 'Simulating Incident...' : '⚡ Generate Test Failure Black Box'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {blackboxes.map((bb) => {
                const failSummary = bb.failure_summary || {};
                const machSnap = bb.machine_snapshot || {};
                const status = bb.incident_status || 'OPEN';

                const statusBg =
                  status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200';

                return (
                  <div
                    key={bb.id}
                    className="bg-white rounded-xl border border-industrial-border hover:border-steel-blue shadow-sm hover:shadow-industrial transition duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Code and Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-steel-blue bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {bb.blackbox_code}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusBg}`}>
                          {status}
                        </span>
                      </div>

                      {/* Machine Title */}
                      <div>
                        <h4 className="font-bold text-base text-industrial-text group-hover:text-steel-blue transition">
                          {machSnap.name || 'Industrial Machine'}
                        </h4>
                        <div className="text-xs text-industrial-subtext font-mono mt-0.5">
                          Serial: {machSnap.serial_number || 'N/A'} • Type: {machSnap.product_type || 'N/A'}
                        </div>
                      </div>

                      {/* Key Indicators */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Failure Type</div>
                          <div className="text-xs font-extrabold text-red-600 mt-0.5">
                            {failSummary.failure_type || 'FAILURE'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Probability</div>
                          <div className="text-xs font-extrabold text-industrial-text mt-0.5">
                            {((failSummary.failure_probability || 0) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Health</div>
                          <div className="text-xs font-extrabold text-industrial-orange mt-0.5">
                            {(failSummary.health_score || 0).toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* Evidence Counts */}
                      <div className="flex items-center justify-between text-xs text-industrial-subtext pt-1">
                        <span className="flex items-center gap-1.5">
                          <FiActivity className="text-steel-blue" />
                          <span>{bb.telemetry_window?.telemetry_samples_count || (bb.telemetry_history?.length || 0)} Sensor Frames</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FiClock className="text-slate-400" />
                          <span>{bb.failure_timestamp ? new Date(bb.failure_timestamp).toLocaleDateString() : 'N/A'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to={`/blackboxes/${bb.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-steel-blue hover:text-steel-blue-dark transition"
                      >
                        <FiEye /> View Evidence
                      </Link>

                      <Link
                        to={`/blackboxes/${bb.id}?tab=replay`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-steel-blue hover:bg-steel-blue-dark px-3 py-1.5 rounded-lg shadow-sm hover:shadow-glow-blue transition"
                      >
                        <FiPlay className="text-industrial-orange text-xs" /> Time Replay
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
