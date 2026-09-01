import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiUser, FiMail, FiLock, FiShield, FiAlertCircle, FiArrowRight } from 'react-icons/fi';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ENGINEER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        role
      });
      // Auto-login after registration
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
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
          Create Plant Account
        </h2>
        <p className="mt-1.5 text-xs text-industrial-subtext">
          Register with Role-Based Access Control (Admin, Engineer, Viewer)
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                />
              </div>
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
                  placeholder="jane.doe@plant.com"
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
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
                System Role (RBAC)
              </label>
              <div className="relative">
                <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                >
                  <option value="ENGINEER">ENGINEER (Manage & Inspect Assigned Machines)</option>
                  <option value="ADMIN">ADMIN (Full Plant & System Control)</option>
                  <option value="VIEWER">VIEWER (Read-Only Observer)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white font-bold text-sm shadow-sm hover:shadow-glow-blue transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
              <FiArrowRight className="text-base" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-industrial-subtext">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-steel-blue hover:text-steel-blue-dark underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
