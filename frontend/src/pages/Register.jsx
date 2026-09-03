import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiUser, FiMail, FiLock, FiShield, FiAlertCircle, FiArrowRight, FiInfo } from 'react-icons/fi';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      try {
        await register({
          full_name: fullName,
          email,
          password,
          role
        });
      } catch (regErr) {
        // If email is already registered, attempt login with the provided credentials
        if (regErr.message?.includes('already registered') || regErr.errorCode === 'EMAIL_ALREADY_EXISTS') {
          await login(email, password, role);
          navigate('/dashboard');
          return;
        }
        throw regErr;
      }
      
      // Auto-login after registration with chosen role
      await login(email, password, role);
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
          Register with Role-Based Access Control (Admin, Engineer, Client)
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
                  placeholder="name@gmail.com"
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
                Account Role (RBAC)
              </label>
              <div className="relative">
                <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                >
                  <option value="CLIENT">CLIENT (Read-Only Plant Overview)</option>
                  <option value="ENGINEER">ENGINEER (Manage & Inspect Equipment)</option>
                  <option value="ADMIN">ADMIN (Full Control — Max 2 Active Admins)</option>
                </select>
              </div>

              {role === 'ADMIN' && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-1.5">
                  <FiInfo className="text-sm shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Strict Admin Cap:</strong> Only 2 Admin accounts can exist simultaneously. If 2 Admins are registered, an existing Admin must delete their account before a new one can be registered.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white font-bold text-sm shadow-sm hover:shadow-glow-blue transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : `Register as ${role}`}
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
