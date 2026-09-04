import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { machineService } from '../services/machineService';
import { blackboxService } from '../services/blackboxService';
import { useAuth } from '../context/AuthContext';
import {
  FiTool,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertOctagon,
  FiArchive,
  FiRefreshCw,
  FiUser,
  FiMapPin
} from 'react-icons/fi';

export default function Maintenance() {
  const { user, canWrite } = useAuth();
  const [machines, setMachines] = useState([]);
  const [blackboxes, setBlackboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [machRes, bbRes] = await Promise.all([
        machineService.getMachines(),
        blackboxService.listBlackBoxes({ page_size: 50 })
      ]);

      setMachines(machRes?.items || []);
      setBlackboxes(bbRes?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Construct maintenance review action items from real degraded machines and open black boxes
  const maintenanceItems = machines
    .filter(m => (m.current_health_score ?? 100) < 75 || m.status === 'CRITICAL' || m.status === 'WARNING')
    .map(m => {
      const health = m.current_health_score ?? 100;
      const priority = health < 50 || m.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM';
      const relatedBB = blackboxes.find(bb => String(bb.machine_id) === String(m.id) && bb.incident_status !== 'RESOLVED');

      return {
        id: `MNT-${m.id.slice(-6).toUpperCase()}`,
        machine_id: m.id,
        serial_number: m.serial_number,
        machine_name: m.name,
        location: m.location || 'Main Bay',
        health_score: health,
        status: m.status,
        priority: priority,
        assigned_engineer: m.assigned_engineer?.full_name || 'Unassigned',
        active_blackbox: relatedBB ? relatedBB.blackbox_code : null,
        blackbox_id: relatedBB ? relatedBB.id : null,
        issue_summary: relatedBB
          ? `Active Failure Incident (${relatedBB.failure_summary?.failure_type || 'FAILURE'}) detected with ${(relatedBB.failure_summary?.failure_probability * 100).toFixed(1)}% probability.`
          : `Degraded machine condition (Health Score: ${Math.round(health)}/100). Operating Status: ${m.status}.`,
        action_required: "Physical engineering inspection and condition review required.",
        review_status: relatedBB ? relatedBB.incident_status : (m.status === 'CRITICAL' ? 'OPEN' : 'PENDING_REVIEW')
      };
    });

  const filteredItems = maintenanceItems.filter(item => {
    if (filterPriority === 'ALL') return true;
    return item.priority === filterPriority;
  });

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-industrial-border shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-industrial-text">Plant Maintenance & Review Registry</h1>
              <p className="text-xs text-industrial-subtext">Actionable inspection queue driven by real condition monitoring and Failure Black Box triggers</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-industrial-gray p-1 rounded border border-industrial-border text-xs font-semibold">
                {['ALL', 'HIGH', 'MEDIUM'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1 rounded transition ${
                      filterPriority === p
                        ? 'bg-white text-steel-blue font-bold shadow-sm'
                        : 'text-industrial-subtext hover:text-industrial-text'
                    }`}
                  >
                    {p}
                  </button>
                ))}
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

          {/* Maintenance Items Grid */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-3">
              <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
              <p className="text-sm font-semibold text-industrial-subtext">Loading maintenance queue from Cloud Firestore...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 text-sm flex items-center gap-3">
              <FiAlertTriangle className="text-xl shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="industrial-card p-12 text-center text-industrial-subtext space-y-3">
              <FiCheckCircle className="text-4xl text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-industrial-text">All Monitored Assets Healthy</h3>
              <p className="text-xs max-w-md mx-auto">
                No active failure incidents or degraded assets require urgent engineering intervention.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`industrial-card p-5 space-y-4 hover:shadow-industrial-hover transition duration-300 border-l-4 ${
                    item.priority === 'HIGH' ? 'border-l-status-failure' : 'border-l-status-warning'
                  }`}
                >
                  <div className="flex items-start justify-between pb-3 border-b border-industrial-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-steel-blue">{item.serial_number}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          item.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.priority} PRIORITY
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-industrial-text mt-0.5">{item.machine_name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Health Score</span>
                      <span className="font-mono font-bold text-lg text-industrial-orange">{Math.round(item.health_score)}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Condition Diagnosis</span>
                      <p className="text-industrial-text font-medium mt-0.5">{item.issue_summary}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Required Protocol</span>
                      <p className="text-steel-blue font-bold mt-0.5">{item.action_required}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-industrial-border">
                    <span className="text-slate-500">
                      Assigned: <strong className="text-industrial-text">{item.assigned_engineer}</strong>
                    </span>

                    {item.blackbox_id ? (
                      <Link
                        to={`/blackboxes/${item.blackbox_id}`}
                        className="inline-flex items-center gap-1.5 font-bold text-industrial-orange hover:underline text-xs"
                      >
                        <FiArchive /> Inspect Black Box ({item.active_blackbox})
                      </Link>
                    ) : (
                      <Link
                        to={`/equipment/${item.machine_id}`}
                        className="inline-flex items-center gap-1 font-bold text-steel-blue hover:underline text-xs"
                      >
                        <FiTool /> Equipment Diagnostics
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
