import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import RiskBadge from '../components/RiskBadge';
import { predictionService } from '../services/predictionService';
import { machineService } from '../services/machineService';
import { FiClock, FiSearch, FiRefreshCw, FiArchive, FiAlertTriangle } from 'react-icons/fi';

export default function History() {
  const [predictions, setPredictions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, machRes] = await Promise.all([
        predictionService.listPredictions({ page_size: 50 }),
        machineService.getMachines()
      ]);

      setPredictions(predRes?.items || []);
      setMachines(machRes?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load prediction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const machineMap = Object.fromEntries(machines.map(m => [m.id, m]));

  const filtered = predictions.filter(p => {
    const mach = machineMap[p.machine_id] || {};
    const machName = mach.name || '';
    const machSerial = mach.serial_number || '';
    const term = search.toLowerCase();

    const matchesSearch =
      p.id.toLowerCase().includes(term) ||
      (p.failure_type || '').toLowerCase().includes(term) ||
      machName.toLowerCase().includes(term) ||
      machSerial.toLowerCase().includes(term);

    const health = p.health_score !== undefined ? p.health_score : 100;
    const risk =
      health >= 75 ? 'LOW' :
      health >= 50 ? 'MEDIUM' :
      health >= 25 ? 'HIGH' : 'CRITICAL';

    if (riskFilter === 'ALL') return matchesSearch;
    return matchesSearch && risk === riskFilter;
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
              <h1 className="text-2xl font-extrabold text-industrial-text">ML Prediction History Ledger</h1>
              <p className="text-xs text-industrial-subtext">Historical record of machine learning model inferences stored in MongoDB predictions collection</p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-subtext text-sm" />
                <input
                  type="text"
                  placeholder="Filter history..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs rounded border border-industrial-border bg-slate-50 focus:outline-none focus:ring-1 focus:ring-steel-blue w-48 sm:w-60"
                />
              </div>

              <div className="flex items-center gap-1 bg-industrial-gray p-1 rounded border border-industrial-border text-xs font-semibold">
                {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRiskFilter(r)}
                    className={`px-2.5 py-1 rounded transition ${
                      riskFilter === r
                        ? 'bg-white text-steel-blue font-bold shadow-sm'
                        : 'text-industrial-subtext hover:text-industrial-text'
                    }`}
                  >
                    {r}
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

          {/* Historical Table */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-3">
              <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
              <p className="text-sm font-semibold text-industrial-subtext">Loading prediction records...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 text-sm flex items-center gap-3">
              <FiAlertTriangle className="text-xl shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="industrial-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-industrial-gray border-b border-industrial-border text-industrial-subtext uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4">Prediction ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Equipment</th>
                      <th className="py-3 px-4">ML Mode</th>
                      <th className="py-3 px-4">Probability</th>
                      <th className="py-3 px-4">Health Score</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Model Version</th>
                      <th className="py-3 px-4 text-right">Black Box Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border">
                    {filtered.map((item) => {
                      const mach = machineMap[item.machine_id] || {};
                      const health = item.health_score !== undefined ? item.health_score : 100;
                      const risk =
                        health >= 75 ? 'LOW' :
                        health >= 50 ? 'MEDIUM' :
                        health >= 25 ? 'HIGH' : 'CRITICAL';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-steel-blue">{item.id}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-industrial-text">{mach.name || item.machine_id}</div>
                            <div className="text-[10px] font-mono text-slate-400">{mach.serial_number}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                              item.failure_prediction ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {item.failure_type || 'NORMAL'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-industrial-orange">
                            {((item.failure_probability || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-industrial-text">
                            {Math.round(health)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {((item.confidence || 0.95) * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {item.model_version || 'v1.0'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.blackbox_code ? (
                              <Link
                                to={`/blackboxes/code/${item.blackbox_code}`}
                                className="inline-flex items-center gap-1 font-mono font-bold text-xs text-industrial-orange hover:underline"
                              >
                                <FiArchive /> {item.blackbox_code}
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
