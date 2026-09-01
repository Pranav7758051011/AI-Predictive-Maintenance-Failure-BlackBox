import React from 'react';
import { Link } from 'react-router-dom';
import { FiCpu, FiShield } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-industrial-border mt-16 text-industrial-subtext">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-steel-blue text-white flex items-center justify-center font-bold">
                <FiCpu className="text-industrial-orange text-lg" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-industrial-text">INDUSENSE AI</span>
            </div>
            <p className="text-xs text-industrial-subtext leading-relaxed">
              Predict smarter. Maintain earlier. Operate better.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-industrial-subtext bg-industrial-gray px-2.5 py-1 rounded border border-industrial-border">
              <FiShield className="text-steel-blue" /> Local Machine Learning Demonstration System
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-industrial-text">Platform</h4>
            <ul className="space-y-1.5">
              <li><Link to="/dashboard" className="hover:text-steel-blue transition">Predictive Dashboard</Link></li>
              <li><Link to="/equipment" className="hover:text-steel-blue transition">Equipment Catalog</Link></li>
              <li><Link to="/sensors" className="hover:text-steel-blue transition">Live Sensor Analytics</Link></li>
            </ul>
          </div>

          {/* ML & Analytics */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-industrial-text">Intelligence</h4>
            <ul className="space-y-1.5">
              <li><Link to="/predictions" className="hover:text-steel-blue transition">Failure Predictions</Link></li>
              <li><Link to="/anomalies" className="hover:text-steel-blue transition">Isolation Forest Log</Link></li>
              <li><Link to="/ml-insights" className="hover:text-steel-blue transition">ML Architecture & SHAP</Link></li>
            </ul>
          </div>

          {/* Maintenance & Support */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-industrial-text">Operations</h4>
            <ul className="space-y-1.5">
              <li><Link to="/maintenance" className="hover:text-steel-blue transition">Preventive Work Orders</Link></li>
              <li><Link to="/history" className="hover:text-steel-blue transition">Prediction Audit Trail</Link></li>
              <li><a href="#about" className="hover:text-steel-blue transition">Local System Architecture</a></li>
            </ul>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-industrial-border flex flex-col sm:flex-row items-center justify-between text-xs text-industrial-subtext">
          <p>© {new Date().getFullYear()} INDUSENSE AI. Educational & Portfolio Demonstration Platform.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono text-[11px]">
            <span>FastAPI: Online</span>
            <span>RandomForest: Active</span>
            <span>React + Three.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
