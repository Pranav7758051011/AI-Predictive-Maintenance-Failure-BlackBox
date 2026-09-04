import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu, FiUser, FiMail, FiLock, FiShield, FiAlertCircle, FiArrowRight, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

export default function Register() {
  const { register, login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ENGINEER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        if (regErr.message?.includes('already registered') || regErr.message?.includes('already exists')) {
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

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle(role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google Sign-Up failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const roleOptions = [
    { id: 'ADMIN', label: 'Admin', desc: 'Full Control', icon: FiShield },
    { id: 'ENGINEER', label: 'Engineer', desc: 'Manage Equipment', icon: FiCpu },
    { id: 'CLIENT', label: 'Client', desc: 'Read-Only View', icon: FiUser }
  ];

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

          {/* Interactive Role Selector */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-industrial-text mb-1.5">
              Assign Account Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setRole(opt.id)}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-steel-blue text-white border-steel-blue-dark shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={isSelected ? 'text-industrial-orange' : 'text-slate-400'} />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[9px] opacity-80">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
                  placeholder="name@factory.io"
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
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-industrial-border rounded-lg text-sm text-industrial-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-steel-blue focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-steel-blue hover:bg-steel-blue-dark text-white font-bold text-sm shadow-sm hover:shadow-glow-blue transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : `Register as ${role}`}
              <FiArrowRight className="text-base" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              or continue with
            </span>
            <div className="border-t border-slate-200 w-full"></div>
          </div>

          {/* Google Sign-Up Button (Downside) */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition duration-200 hover:border-slate-400 disabled:opacity-50"
            >
              <FcGoogle className="text-xl" />
              <span>{googleLoading ? 'Connecting to Google...' : `Sign Up with Google (${role})`}</span>
            </button>
          </div>

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
