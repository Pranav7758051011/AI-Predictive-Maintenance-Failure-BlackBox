import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiMail, FiLock, FiAlertCircle, FiArrowRight, FiShield, FiUser, FiTool } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, selectedRole);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials and role.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPassword, role) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSelectedRole(role);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { id: 'ADMIN', label: 'Admin', desc: 'Max 2 Admins • Full Control', icon: FiShield },
    { id: 'ENGINEER', label: 'Engineer', desc: 'Machine Management', icon: FiTool },
    { id: 'CLIENT', label: 'Client', desc: 'Observer / Read-Only', icon: FiUser }
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-steel-blue text-white shadow-md mb-3">
          <FiCpu className="text-2xl text-industrial-orange" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-industrial-text">
          Sign In to INDUSENSE AI
        </h2>
        <p className="mt-1.5 text-xs text-industrial-subtext">
          Industrial Predictive Maintenance & Failure Black Box Console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-industrial-card rounded-xl border border-industrial-border">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2.5">
              <FiAlertCircle className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedRole === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSelectedRole(opt.id)}
                      className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-steel-blue text-white border-steel-blue-dark shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={isSelected ? 'text-industrial-orange' : 'text-slate-400'} />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {selectedRole === 'ADMIN' ? '⚠️ System limit: Maximum 2 Admin accounts can exist simultaneously.' :
                 selectedRole === 'ENGINEER' ? 'Access and inspect assigned machines & telemetry streams.' :
                 'Read-only client observer view.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@plant.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white font-bold text-sm shadow-sm hover:shadow-glow-blue transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : `Sign In as ${selectedRole}`}
              <FiArrowRight className="text-base" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-industrial-border">
            <div className="text-[11px] font-bold uppercase tracking-wider text-industrial-subtext text-center mb-2.5">
              Quick Demo Login
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin.plant@factory.io', 'SecureAdminPassword123!', 'ADMIN')}
                className="px-2 py-1.5 text-[11px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Admin (1 of 2)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('engineer.lead@factory.io', 'SecureEngineerPassword123!', 'ENGINEER')}
                className="px-2 py-1.5 text-[11px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Lead Engineer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('viewer.observer@factory.io', 'SecureViewerPassword123!', 'CLIENT')}
                className="px-2 py-1.5 text-[11px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Client View
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-industrial-subtext">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-steel-blue hover:text-steel-blue-dark underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
