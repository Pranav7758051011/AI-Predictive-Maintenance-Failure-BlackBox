import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiMail, FiLock, FiAlertCircle, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

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

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  placeholder="engineer@plant.com"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white font-bold text-sm shadow-sm hover:shadow-glow-blue transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Console'}
              <FiArrowRight className="text-base" />
            </button>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick Demo Logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@plant.com', 'AdminPassword123!')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <FiCheckCircle className="text-emerald-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('engineer1@plant.com', 'EngPassword123!')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <FiCheckCircle className="text-industrial-orange" />
                <span>Engineer</span>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-industrial-subtext">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-steel-blue hover:text-steel-blue-dark underline">
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
