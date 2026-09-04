import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCpu, FiArrowRight, FiUser, FiLogOut, FiShield, FiArchive, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout, deleteAccount } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const navLinks = [
    { path: '/', label: 'Platform' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/equipment', label: 'Equipment' },
    { path: '/sensors', label: 'Live Sensors' },
    { path: '/predictions', label: 'AI Predictions' },
    { path: '/blackboxes', label: 'Black Box' },
    { path: '/ml-insights', label: 'ML Insights' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const prompt = role === 'ADMIN'
      ? 'Are you sure you want to permanently delete your Admin account? This will free up 1 of the 2 Admin slots.'
      : 'Are you sure you want to permanently delete your account?';
    if (window.confirm(prompt)) {
      try {
        await deleteAccount();
        navigate('/login');
      } catch (err) {
        alert('Failed to delete account: ' + err.message);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-industrial-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-md bg-steel-blue text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-steel-blue-dark group-hover:shadow-glow-blue transition duration-300 transform group-hover:scale-105">
            <FiCpu className="text-industrial-orange text-xl group-hover:rotate-45 transition duration-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-industrial-text group-hover:text-steel-blue transition">INDUSENSE</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-industrial-orange text-white group-hover:bg-industrial-orange-hover shadow-sm transition">AI</span>
            </div>
            <div className="text-[10px] uppercase font-semibold text-industrial-subtext tracking-wider">Predictive Maintenance</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-industrial-subtext">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`py-1 text-xs font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'text-steel-blue border-b-2 border-industrial-orange pb-0.5 font-extrabold'
                    : 'hover:text-steel-blue text-industrial-subtext'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-extrabold text-industrial-text">{user?.full_name || 'Operator'}</span>
                <span className="text-[10px] font-bold text-industrial-orange uppercase tracking-wider">{role}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 transition shadow-sm"
                  title="Account Settings"
                >
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="text-sm" />
                  )}
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-industrial-border rounded-xl shadow-lg py-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-800 truncate">{user?.full_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                      <div className="text-[10px] font-extrabold text-industrial-orange mt-0.5">{role}</div>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                    >
                      <FiTrash2 className="text-xs" />
                      <span>Delete My Account</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                    >
                      <FiLogOut className="text-xs" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <FiLogOut className="text-lg" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-bold text-steel-blue hover:text-steel-blue-dark px-3 py-1.5 rounded transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold text-white bg-steel-blue hover:bg-steel-blue-dark px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow-glow-blue transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
