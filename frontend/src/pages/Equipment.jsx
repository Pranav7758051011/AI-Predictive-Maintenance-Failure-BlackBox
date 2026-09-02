import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import MachineCard from '../components/MachineCard';
import { machineService } from '../services/machineService';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiFilter, FiRefreshCw, FiPlus, FiBox, FiAlertCircle } from 'react-icons/fi';

export default function Equipment() {
  const { user, isAdmin, canWrite } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Add machine modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('M');
  const [newLocation, setNewLocation] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadMachines = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await machineService.getMachines();
      setMachines(res?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load equipment list from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    try {
      await machineService.createMachine({
        serial_number: newSerial.trim().toUpperCase(),
        name: newName.trim(),
        product_type: newType,
        location: newLocation.trim() || 'Main Plant Bay'
      });

      setShowAddModal(false);
      setNewSerial('');
      setNewName('');
      setNewLocation('');
      await loadMachines();
    } catch (err) {
      setModalError(err.message || 'Failed to register machine.');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredMachines = machines.filter(m => {
    const term = search.toLowerCase();
    const matchesSearch =
      (m.name || '').toLowerCase().includes(term) ||
      (m.serial_number || '').toLowerCase().includes(term) ||
      (m.location || '').toLowerCase().includes(term);

    const health = m.current_health_score !== undefined ? m.current_health_score : 100;
    const computedStatus = health >= 75 ? 'HEALTHY' : health >= 50 ? 'WARNING' : 'CRITICAL';
    if (filterStatus === 'HEALTHY') return matchesSearch && computedStatus === 'HEALTHY';
    if (filterStatus === 'WARNING') return matchesSearch && computedStatus === 'WARNING';
    if (filterStatus === 'CRITICAL') return matchesSearch && computedStatus === 'CRITICAL';
    return matchesSearch;
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
              <h1 className="text-2xl font-extrabold text-industrial-text">Industrial Equipment Fleet</h1>
              <p className="text-xs text-industrial-subtext">Catalog of monitored physical industrial assets in MongoDB</p>
            </div>

            {/* Actions & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-subtext text-sm" />
                <input
                  type="text"
                  placeholder="Search equipment..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs rounded border border-industrial-border bg-slate-50 focus:outline-none focus:ring-1 focus:ring-steel-blue w-48 sm:w-64"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-industrial-gray p-1 rounded border border-industrial-border text-xs font-semibold">
                {['ALL', 'HEALTHY', 'WARNING', 'CRITICAL'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded transition ${
                      filterStatus === st
                        ? 'bg-white text-steel-blue font-bold shadow-sm'
                        : 'text-industrial-subtext hover:text-industrial-text'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {canWrite ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-industrial-orange hover:bg-industrial-orange-hover text-white text-xs font-extrabold transition shadow-md hover:shadow-glow-orange"
                >
                  <FiPlus className="text-base" /> Add Machine
                </button>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-300">
                  Client View (Read Only)
                </span>
              )}

              <button
                onClick={loadMachines}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Machine Grid */}
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-industrial-border text-center space-y-3">
              <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
              <p className="text-sm font-semibold text-industrial-subtext">Loading fleet records from database...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 text-sm flex items-center gap-3">
              <FiAlertCircle className="text-xl shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="industrial-card p-12 text-center text-industrial-subtext space-y-2">
              <FiFilter className="text-3xl mx-auto text-industrial-subtext/50" />
              <h3 className="text-base font-bold text-industrial-text">No matching equipment found</h3>
              <p className="text-xs">Try adjusting your search terms or filter settings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMachines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-industrial-border shadow-industrial-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-industrial-text flex items-center gap-2">
                <FiBox className="text-industrial-orange" />
                Register New Equipment
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateMachine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1">
                  Serial Number (e.g. CNC-701)
                </label>
                <input
                  type="text"
                  required
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="CNC-701"
                  className="w-full px-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-steel-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1">
                  Machine Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Heavy 5-Axis Milling Machine"
                  className="w-full px-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-steel-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1">
                    Product Grade
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-steel-blue"
                  >
                    <option value="L">L (Low - 50%)</option>
                    <option value="M">M (Medium - 30%)</option>
                    <option value="H">H (High - 20%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1">
                    Plant Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Sector 4B"
                    className="w-full px-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-steel-blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-steel-blue hover:bg-steel-blue-dark text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-glow-blue disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
