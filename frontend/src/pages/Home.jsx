import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiActivity,
  FiCpu,
  FiCheckCircle,
  FiTrendingUp,
  FiBox,
  FiArchive,
  FiShield
} from 'react-icons/fi';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Machine3DViewer from '../components/Machine3DViewer';
import SensorChart from '../components/SensorChart';
import RiskBadge from '../components/RiskBadge';
import HealthGauge from '../components/HealthGauge';
import { machineService } from '../services/machineService';

// Fade-in-up animation variant
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.12, ease: 'easeOut' } })
};

// Step process data
const PROCESS_STEPS = [
  { step: '01', title: 'Normal Operation', desc: 'Sensors stream nominal thermal & rotational parameters.' },
  { step: '02', title: 'Sensor Deviation', desc: 'Torque or temperature drift emerges under heavy tool load.' },
  { step: '03', title: 'XGBoost Inference', desc: 'Dual-stage booster flags multi-parameter failure probability.' },
  { step: '04', title: 'Black Box Sealed', desc: '24-hour telemetry window and audit trail frozen immutably.' },
  { step: '05', title: 'Failure Replay', desc: 'Engineers scrub chronological sensor frames for root-cause.' }
];

// ML Pipeline steps
const ML_PIPELINE = [
  { step: 'STAGE 01', title: 'Physical Telemetry Ingestion', desc: 'Capture air temp, process temp, rotational speed, torque, and tool wear via Flask PyMongo.', accent: 'border-t-industrial-orange' },
  { step: 'STAGE 02', title: 'Physics Feature Engineering', desc: 'Compute ΔT, mechanical power (W), and overstrain product (min×Nm) vectors.', accent: 'border-t-steel-blue' },
  { step: 'STAGE 03', title: 'Binary Breakdown Classification', desc: 'Native XGBoost evaluates binary failure threshold with 28.5:1 scale_pos_weight correction.', accent: 'border-t-steel-blue-dark' },
  { step: 'STAGE 04', title: 'Multiclass Failure Classification', desc: 'Secondary booster isolates failure mode: HDF, PWF, OSF, TWF, or RNF.', accent: 'border-t-status-warning' },
  { step: 'STAGE 05', title: 'Health Scoring Engine', desc: 'Deterministic 0–100 health index calibrated across operating stress boundaries.', accent: 'border-t-industrial-orange' },
  { step: 'STAGE 06', title: 'Failure Black Box Capture', desc: 'Seals 24-hour time-series window and generates forensic audit ledger.', accent: 'border-t-steel-blue' },
  { step: 'STAGE 07', title: 'Interactive Forensic Replay', desc: 'Playback degraded telemetry sequence frame-by-frame with synchronized dials.', accent: 'border-t-status-success' },
];

export default function Home() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await machineService.getMachines();
        setMachines(res?.items || []);
      } catch (err) {
        console.error('Home preview machine load error:', err);
      }
    }
    loadPreview();
  }, []);

  const heroMachine = machines[0] || {
    id: 'CNC-204',
    name: '5-Axis Precision CNC',
    serial_number: 'CNC-204',
    health: 94,
    temperature: 35.4,
    vibration: 2.4,
    pressure: 5.1,
    current: 14.2
  };

  return (
    <div className="min-h-screen bg-canvas text-industrial-text flex flex-col">
      <Navbar />

      <main className="flex-1">

        {/* ===== HERO ===== */}
        <section className="relative pt-10 pb-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left: Headline */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-industrial-border bg-white text-xs font-bold text-steel-blue uppercase tracking-wider shadow-sm hover:border-steel-blue/60 hover:shadow-glow-blue transition duration-200">
                <FiCpu className="text-industrial-orange text-sm" />
                <span>AI PREDICTIVE MAINTENANCE & FAILURE BLACK BOX</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-industrial-text tracking-tight leading-[1.1]">
                Predict equipment breakdown & freeze{' '}
                <span className="text-industrial-orange underline underline-offset-8 decoration-industrial-orange/30">
                  forensic Black Boxes.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-industrial-subtext leading-relaxed">
                Dual-stage native XGBoost classification, 24-hour telemetry snapshot sealing, and interactive time-series replay for industrial manufacturing assets.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/dashboard"
                  className="btn-industrial inline-flex items-center gap-2 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded shadow-industrial hover:shadow-glow-orange transition transform active:scale-95"
                >
                  <span>Launch Control Console</span>
                  <FiArrowRight className="text-base" />
                </Link>

                <Link
                  to="/blackboxes"
                  className="inline-flex items-center gap-2 bg-white hover:bg-industrial-gray text-industrial-text text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded border border-industrial-border hover:border-steel-blue/40 shadow-sm transition"
                >
                  <FiArchive className="text-industrial-orange" />
                  <span>Failure Black Box</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-industrial-border text-xs text-industrial-subtext">
                {[
                  'Flask + PyMongo Backend',
                  'Dual-Stage Native XGBoost',
                  '24-Hour Telemetry Snapshots',
                  'Append-Only Audit Trails'
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 font-medium hover:text-steel-blue transition cursor-default">
                    <FiCheckCircle className="text-status-success text-sm shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: 3D CNC Hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-6 relative"
            >
              <Machine3DViewer machineData={heroMachine} height="h-[460px]" />

              {/* Floating Metric Cards */}
              <div className="absolute -top-3 -right-3 hidden sm:block bg-white p-3 rounded-lg border border-industrial-border shadow-industrial hover:shadow-industrial-hover hover:-translate-y-0.5 transition duration-200 text-xs cursor-default">
                <div className="text-[10px] font-bold uppercase text-industrial-subtext">PROCESS TEMPERATURE</div>
                <div className="text-base font-extrabold font-mono text-industrial-text">308.6 K</div>
                <span className="text-[10px] text-status-success font-bold">NOMINAL (ΔT: 10.5K)</span>
              </div>

              <div className="absolute top-1/2 -left-4 hidden sm:block bg-white p-3 rounded-lg border border-industrial-border shadow-industrial hover:shadow-industrial-hover hover:-translate-y-0.5 transition duration-200 text-xs cursor-default transform -translate-y-1/2">
                <div className="text-[10px] font-bold uppercase text-industrial-subtext">XGBOOST STATUS</div>
                <div className="text-base font-extrabold font-mono text-emerald-600">NO FAILURE</div>
                <span className="text-[10px] text-status-success font-bold">PROBABILITY: 4.0%</span>
              </div>

              <div className="absolute -bottom-3 -right-3 hidden sm:block bg-white p-3 rounded-lg border border-industrial-border shadow-industrial hover:shadow-industrial-hover hover:-translate-y-0.5 transition duration-200 text-xs cursor-default">
                <div className="text-[10px] font-bold uppercase text-industrial-subtext">MACHINE HEALTH</div>
                <div className="text-base font-extrabold font-mono text-steel-blue">96 / 100</div>
                <span className="text-[10px] text-industrial-subtext font-bold">STATUS: HEALTHY</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== STATISTICS STRIP ===== */}
        <section className="bg-steel-blue-dark text-white border-y border-steel-blue py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '97.75%', label: 'Test Accuracy', sub: 'Native XGBoost on AI4I' },
                { value: '0.967', label: 'ROC-AUC Score', sub: 'Binary Breakdown Classifier' },
                { value: '24 Hours', label: 'Telemetry Window', sub: 'Frozen in Black Box' },
                { value: '100%', label: 'Immutable Audit Trail', sub: 'Append-Only Ledger' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={idx * 0.1}
                  className={`p-4 hover:bg-white/5 rounded-lg transition duration-200 cursor-default ${idx < 3 ? 'border-r border-white/10' : ''}`}
                >
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-industrial-orange">{stat.value}</div>
                  <div className="text-xs font-bold uppercase text-slate-200 mt-1">{stat.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PROBLEM SECTION ===== */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center max-w-3xl mx-auto space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-industrial-orange">FORENSIC TELEMETRY</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-industrial-text">
              Every catastrophic failure leaves pre-cursor signals.
            </h2>
            <p className="text-sm sm:text-base text-industrial-subtext">
              Monitor Air Temperature, Process Temperature, Rotational Speed, Torque, and Tool Wear in real-time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {PROCESS_STEPS.map((p, idx) => (
              <motion.div
                key={p.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={idx * 0.1}
                className="industrial-card p-5 space-y-2 border-t-4 border-t-steel-blue hover:border-t-industrial-orange transition duration-300 group"
              >
                <span className="text-xs font-mono font-extrabold text-industrial-orange group-hover:text-industrial-orange-hover transition">{p.step}</span>
                <h4 className="text-sm font-bold text-industrial-text group-hover:text-steel-blue transition">{p.title}</h4>
                <p className="text-xs text-industrial-subtext">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== ML PIPELINE ===== */}
        <section id="how-it-works" className="py-16 bg-industrial-gray/50 border-y border-industrial-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto space-y-3"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-steel-blue">END-TO-END ARCHITECTURE</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-industrial-text">
                How INDUSENSE AI Connects Telemetry to Black Box
              </h2>
              <p className="text-sm sm:text-base text-industrial-subtext">
                From raw physical sensor telemetry in MongoDB to XGBoost inference and interactive time-series replay.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {ML_PIPELINE.map((pipe, idx) => (
                <motion.div
                  key={pipe.step}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={idx * 0.08}
                  className={`industrial-card p-5 space-y-2 hover:shadow-industrial-hover hover:-translate-y-1 border-t-4 ${pipe.accent} transition duration-300 group`}
                >
                  <span className="text-[11px] font-bold font-mono text-industrial-orange group-hover:text-industrial-orange-hover transition">{pipe.step}</span>
                  <h3 className="text-sm font-bold text-industrial-text group-hover:text-steel-blue transition">{pipe.title}</h3>
                  <p className="text-xs text-industrial-subtext leading-relaxed">{pipe.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== EQUIPMENT SHOWCASE ===== */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-steel-blue">ASSET CATALOG</span>
              <h2 className="text-3xl font-extrabold text-industrial-text mt-1">Monitored Plant Equipment</h2>
            </div>
            <Link
              to="/equipment"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-industrial-orange hover:text-industrial-orange-hover hover:underline transition"
            >
              <span>View All Assets</span>
              <FiArrowRight />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(machines.length > 0 ? machines.slice(0, 3) : [
              { id: '1', serial_number: 'CNC-204', name: '5-Axis Precision CNC', product_type: 'M', current_health_score: 94, status: 'HEALTHY' },
              { id: '2', serial_number: 'PRESS-102', name: 'Hydraulic Stamping Press', product_type: 'H', current_health_score: 88, status: 'HEALTHY' },
              { id: '3', serial_number: 'MOTOR-308', name: 'Induction Drive Motor', product_type: 'L', current_health_score: 92, status: 'HEALTHY' }
            ]).map((machine, idx) => (
              <motion.div
                key={machine.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={idx * 0.1}
                className="industrial-card p-5 space-y-4 hover:shadow-industrial-hover hover:-translate-y-1 transition duration-300 group border-t-2 border-t-transparent hover:border-t-steel-blue"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-industrial-text font-mono group-hover:text-steel-blue transition">{machine.serial_number || machine.id}</h3>
                    <p className="text-xs text-industrial-subtext">{machine.name || 'Industrial Machine'}</p>
                  </div>
                  <RiskBadge level={(machine.current_health_score ?? 100) >= 75 ? 'LOW' : 'HIGH'} />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-industrial-border">
                  <span className="text-industrial-subtext">Health Score:</span>
                  <span className="font-mono font-bold text-industrial-text">{Math.round(machine.current_health_score ?? 100)}%</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-industrial-subtext">Operating Status:</span>
                  <span className="font-semibold text-steel-blue">{machine.status || 'HEALTHY'}</span>
                </div>

                <Link
                  to={`/equipment/${machine.id}`}
                  className="btn-industrial block text-center text-xs font-bold bg-industrial-gray hover:bg-steel-blue hover:text-white text-industrial-text py-2.5 rounded transition duration-200 border border-industrial-border hover:border-steel-blue"
                >
                  Monitor Asset Diagnostics
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-2xl mx-auto space-y-5"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-industrial-text tracking-tight">
              Turn physical telemetry into early action.
            </h2>
            <p className="text-base text-industrial-subtext leading-relaxed">
              Explore how predictive ML classification and Failure Black Box replay transform industrial maintenance.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="btn-industrial inline-flex items-center gap-2 bg-industrial-orange hover:bg-industrial-orange-hover text-white text-sm font-bold uppercase tracking-wider px-8 py-4 rounded shadow-industrial hover:shadow-glow-orange transition transform active:scale-95"
              >
                <span>Open Predictive Dashboard</span>
                <FiArrowRight className="text-base" />
              </Link>
              <Link
                to="/blackboxes"
                className="inline-flex items-center gap-2 bg-white hover:bg-industrial-gray text-industrial-text text-sm font-bold uppercase tracking-wider px-6 py-4 rounded border border-industrial-border hover:border-steel-blue/40 shadow-sm transition"
              >
                <FiArchive />
                <span>Failure Black Boxes</span>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
