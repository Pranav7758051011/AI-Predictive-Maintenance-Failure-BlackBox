import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import HealthGauge from '../components/HealthGauge';
import { blackboxService } from '../services/blackboxService';
import { useAuth } from '../context/AuthContext';
import {
  FiArrowLeft,
  FiArchive,
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiClock,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiList,
  FiLayers,
  FiShield,
  FiRefreshCw,
  FiFileText,
  FiSliders
} from 'react-icons/fi';

export default function BlackBoxDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, canWrite } = useAuth();

  const [blackbox, setBlackbox] = useState(null);
  const [replayData, setReplayData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  // Status updating
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState('');

  // Replay State
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef(null);

  const loadBlackBox = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bb, replay, audit] = await Promise.all([
        blackboxService.getBlackBoxById(id),
        blackboxService.getReplayFrames(id),
        blackboxService.getAuditTrail(id)
      ]);

      setBlackbox(bb);
      setReplayData(replay);
      setAuditLogs(audit?.items || []);
      if (replay?.frames?.length > 0) {
        setCurrentFrameIdx(replay.frames.length - 1); // default to final failure frame
      }
    } catch (err) {
      setError(err.message || 'Failed to load Black Box incident.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlackBox();
  }, [id]);

  // Replay timer loop
  useEffect(() => {
    if (isPlaying && replayData?.frames?.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= replayData.frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, replayData]);

  const handleStatusChange = async (newStatus) => {
    if (!canWrite) return;
    setUpdatingStatus(true);
    setStatusSuccess('');
    try {
      const updated = await blackboxService.updateStatus(id, newStatus);
      setBlackbox((prev) => ({ ...prev, incident_status: newStatus }));
      setStatusSuccess(`Incident status updated to ${newStatus}`);
      // Refresh audit logs
      const audit = await blackboxService.getAuditTrail(id);
      setAuditLogs(audit?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to update incident status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <FiRefreshCw className="animate-spin text-3xl text-steel-blue mx-auto" />
            <p className="text-sm font-semibold text-industrial-subtext">Loading Failure Black Box Snapshot...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blackbox) {
    return (
      <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto p-8 flex items-center justify-center">
          <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800 space-y-3 w-full">
            <div className="flex items-center gap-2.5 font-bold text-base">
              <FiAlertTriangle className="text-xl" />
              <span>Incident Record Error</span>
            </div>
            <p className="text-xs">{error || 'Black Box incident not found.'}</p>
            <Link to="/blackboxes" className="inline-flex items-center gap-1.5 text-xs font-bold text-steel-blue hover:underline pt-2">
              <FiArrowLeft /> Return to Incidents List
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const failSummary = blackbox.failure_summary || {};
  const machSnap = blackbox.machine_snapshot || {};
  const windowMeta = blackbox.telemetry_window || {};
  const timeline = blackbox.event_timeline || [];
  const status = blackbox.incident_status || 'OPEN';

  const currentFrame = replayData?.frames?.[currentFrameIdx] || null;
  const currentTelemetry = currentFrame?.telemetry || {};
  const currentPrediction = currentFrame?.prediction || {};

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
          
          {/* Top Breadcrumb & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-industrial-border shadow-sm">
            <div className="flex items-center gap-3">
              <Link
                to="/blackboxes"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                title="Back to Black Boxes"
              >
                <FiArrowLeft className="text-lg" />
              </Link>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-black text-steel-blue bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                    {blackbox.blackbox_code}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${
                    status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {status}
                  </span>
                </div>
                <div className="text-xs text-industrial-subtext mt-1">
                  Sealed: {blackbox.failure_timestamp ? new Date(blackbox.failure_timestamp).toUTCString() : 'N/A'} • Trigger: {blackbox.trigger_source || 'AUTOMATIC_ML_TRIGGER'}
                </div>
              </div>
            </div>

            {/* Lifecycle Status Management */}
            {canWrite && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Update Status:</span>
                <select
                  value={status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-industrial-border rounded-lg text-xs font-bold text-industrial-text focus:ring-2 focus:ring-steel-blue"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            )}
          </div>

          {statusSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <FiCheckCircle />
              <span>{statusSuccess}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-industrial-border gap-2">
            {[
              { id: 'overview', label: 'Incident Snapshot', icon: FiArchive },
              { id: 'replay', label: 'Failure Time-Series Replay', icon: FiPlay },
              { id: 'timeline', label: 'Event Timeline', icon: FiLayers },
              { id: 'audit', label: 'Audit Trail', icon: FiShield }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-lg transition border-t-2 ${
                    active
                      ? 'bg-white text-steel-blue border-t-industrial-orange border-x border-b-0 border-industrial-border -mb-[1px] shadow-sm'
                      : 'text-industrial-subtext hover:text-industrial-text border-t-transparent'
                  }`}
                >
                  <Icon className={active ? 'text-industrial-orange' : ''} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Incident Snapshot Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-industrial-border shadow-sm space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Classified Failure Type</div>
                  <div className="text-xl font-extrabold text-red-600">
                    {failSummary.failure_type || 'FAILURE'}
                  </div>
                  <div className="text-[11px] text-slate-500">Model: {failSummary.model_version || 'v1.0'}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-industrial-border shadow-sm space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Failure Probability</div>
                  <div className="text-xl font-extrabold text-industrial-text">
                    {((failSummary.failure_probability || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500">Confidence: {((failSummary.confidence || 0) * 100).toFixed(1)}%</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-industrial-border shadow-sm space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Health at Failure</div>
                  <div className="text-xl font-extrabold text-industrial-orange">
                    {(failSummary.health_score || 0).toFixed(1)} / 100
                  </div>
                  <div className="text-[11px] text-slate-500">Degraded Condition</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-industrial-border shadow-sm space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Captured Telemetry Window</div>
                  <div className="text-xl font-extrabold text-steel-blue">
                    {windowMeta.available_duration_hours ?? 24}h / 24h
                  </div>
                  <div className="text-[11px] text-slate-500">{windowMeta.telemetry_samples_count || (blackbox.telemetry_history?.length || 0)} sensor frames</div>
                </div>
              </div>

              {/* Machine Snapshot Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FiArchive className="text-industrial-orange" />
                    <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider">
                      Frozen Machine Snapshot (At Incident Time)
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div><span className="text-slate-400">Machine Name:</span> <span className="font-bold text-industrial-text ml-1">{machSnap.name}</span></div>
                    <div><span className="text-slate-400">Serial Number:</span> <span className="font-bold text-industrial-text ml-1">{machSnap.serial_number}</span></div>
                    <div><span className="text-slate-400">Product Type:</span> <span className="font-bold text-industrial-text ml-1">{machSnap.product_type}</span></div>
                    <div><span className="text-slate-400">Location:</span> <span className="font-bold text-industrial-text ml-1">{machSnap.location || 'Bay Area'}</span></div>
                    <div><span className="text-slate-400">Status At Failure:</span> <span className="font-bold text-industrial-text ml-1">{machSnap.status}</span></div>
                    <div><span className="text-slate-400">Assigned Engineer ID:</span> <span className="font-mono text-slate-600 ml-1">{machSnap.assigned_engineer_id || 'None'}</span></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FiFileText className="text-steel-blue" />
                    <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider">
                      Forensic Telemetry Window Metadata
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div><span className="text-slate-400">Requested Duration:</span> <span className="font-bold text-industrial-text ml-1">24 Hours</span></div>
                    <div><span className="text-slate-400">Actual Available Duration:</span> <span className="font-bold text-industrial-text ml-1">{windowMeta.available_duration_hours || 0} Hours</span></div>
                    <div><span className="text-slate-400">Telemetry Frames:</span> <span className="font-bold text-industrial-text ml-1">{windowMeta.telemetry_samples_count || (blackbox.telemetry_history?.length || 0)}</span></div>
                    <div><span className="text-slate-400">Predictions Captured:</span> <span className="font-bold text-industrial-text ml-1">{windowMeta.predictions_count || (blackbox.prediction_history?.length || 0)}</span></div>
                    <div><span className="text-slate-400">Evidence Sealed By:</span> <span className="font-bold text-industrial-text ml-1">{blackbox.trigger_source || 'SYSTEM'}</span></div>
                    <div><span className="text-slate-400">Immutability Guarantee:</span> <span className="font-bold text-emerald-600 ml-1">Strictly Immutable</span></div>
                  </div>
                </div>
              </div>

              {/* Quick Telemetry History Preview Table */}
              <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider">
                  Captured 24-Hour Telemetry Frames ({blackbox.telemetry_history?.length || 0} records)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Air Temp (K)</th>
                        <th className="py-2.5 px-3">Process Temp (K)</th>
                        <th className="py-2.5 px-3">Speed (RPM)</th>
                        <th className="py-2.5 px-3">Torque (Nm)</th>
                        <th className="py-2.5 px-3">Tool Wear (min)</th>
                        <th className="py-2.5 px-3">ΔT (K)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(blackbox.telemetry_history || []).slice(0, 10).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans text-slate-700">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'N/A'}</td>
                          <td className="py-2 px-3">{t.air_temp}</td>
                          <td className="py-2 px-3">{t.process_temp}</td>
                          <td className="py-2 px-3">{t.rotational_speed}</td>
                          <td className="py-2 px-3">{t.torque}</td>
                          <td className="py-2 px-3">{t.tool_wear}</td>
                          <td className="py-2 px-3 text-steel-blue">{t.temperature_difference ?? (t.process_temp - t.air_temp).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Chronological Failure Replay */}
          {activeTab === 'replay' && (
            <div className="space-y-6">
              {/* Replay Control Bar */}
              <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-industrial-text flex items-center gap-2">
                      <FiPlay className="text-industrial-orange" />
                      Chronological Failure Incident Replay
                    </h3>
                    <p className="text-xs text-industrial-subtext">
                      Step through or play the 24-hour time-series frames leading up to the sealed failure event.
                    </p>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => setCurrentFrameIdx((prev) => Math.max(0, prev - 1))}
                      disabled={currentFrameIdx === 0}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-30"
                      title="Previous Frame"
                    >
                      <FiSkipBack />
                    </button>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 bg-steel-blue hover:bg-steel-blue-dark text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-glow-blue transition"
                    >
                      {isPlaying ? <FiPause /> : <FiPlay />}
                      <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                    </button>

                    <button
                      onClick={() => setCurrentFrameIdx((prev) => Math.min((replayData?.frames?.length || 1) - 1, prev + 1))}
                      disabled={!replayData?.frames || currentFrameIdx >= replayData.frames.length - 1}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-30"
                      title="Next Frame"
                    >
                      <FiSkipForward />
                    </button>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 ml-2">
                      {[1, 2, 5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            playbackSpeed === spd ? 'bg-white text-steel-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Scrubber Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>Frame #{currentFrameIdx + 1} of {replayData?.frames?.length || 0}</span>
                    <span className="font-sans font-bold text-steel-blue">
                      {currentFrame?.timestamp ? new Date(currentFrame.timestamp).toUTCString() : 'N/A'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (replayData?.frames?.length || 1) - 1)}
                    value={currentFrameIdx}
                    onChange={(e) => setCurrentFrameIdx(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-industrial-orange"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>-24 Hours (Baseline)</span>
                    <span className="text-red-500">T_Failure (Incident Sealed)</span>
                  </div>
                </div>
              </div>

              {/* Replay Frame Sensor Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sensor Telemetry (Active Frame)</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Process Temp</div>
                      <div className="text-lg font-mono font-bold text-industrial-text mt-0.5">{currentTelemetry.process_temp || 0} K</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Air Temp</div>
                      <div className="text-lg font-mono font-bold text-industrial-text mt-0.5">{currentTelemetry.air_temp || 0} K</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Rotational Speed</div>
                      <div className="text-lg font-mono font-bold text-industrial-text mt-0.5">{currentTelemetry.rotational_speed || 0} RPM</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Torque</div>
                      <div className="text-lg font-mono font-bold text-industrial-text mt-0.5">{currentTelemetry.torque || 0} Nm</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 col-span-2">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Tool Wear</div>
                      <div className="text-lg font-mono font-bold text-industrial-orange mt-0.5">{currentTelemetry.tool_wear || 0} min</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">ML Prediction at Frame</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-600">Failure Detected:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${currentPrediction.failure_prediction ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {currentPrediction.failure_prediction ? 'YES - FAILURE' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-600">Failure Type:</span>
                      <span className="font-bold text-red-600">{currentPrediction.failure_type || 'NORMAL'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-600">Probability:</span>
                      <span className="font-bold text-industrial-text font-mono">
                        {currentPrediction.failure_probability ? `${(currentPrediction.failure_probability * 100).toFixed(1)}%` : 'Baseline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                      <span className="font-bold text-slate-600">Health Score:</span>
                      <span className="font-bold text-industrial-orange font-mono">
                        {currentPrediction.health_score !== undefined && currentPrediction.health_score !== null ? currentPrediction.health_score : 100}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm flex flex-col items-center justify-center text-center">
                  <HealthGauge score={currentPrediction.health_score !== undefined && currentPrediction.health_score !== null ? currentPrediction.health_score : 100} size={150} />
                  <div className="text-xs font-bold text-industrial-subtext mt-2">
                    Dynamic Health Score at Frame #{currentFrameIdx + 1}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Event Timeline */}
          {activeTab === 'timeline' && (
            <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FiLayers className="text-industrial-orange" />
                <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider">
                  Reconstructed Incident Timeline
                </h3>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-steel-blue group-hover:bg-industrial-orange shadow-sm transition" />
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-steel-blue font-mono uppercase tracking-wider">
                          [{ev.event_type}]
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-industrial-text">{ev.description}</p>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Source: {ev.source || 'SYSTEM'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Append-Only Audit Trail */}
          {activeTab === 'audit' && (
            <div className="bg-white p-6 rounded-xl border border-industrial-border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FiShield className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-industrial-text uppercase tracking-wider">
                    Append-Only Forensic Audit Trail ({auditLogs.length} events)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Read-Only Evidence Ledger
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor Role</th>
                      <th className="py-2.5 px-3">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-steel-blue">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-700">
                            {log.actor_role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))}
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
