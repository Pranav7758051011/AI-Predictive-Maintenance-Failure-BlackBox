import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { getAccessToken, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken || !saved) {
      return null;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(getAccessToken);
  const [isLoading, setIsLoading] = useState(true);

  // Verify and hydrate current user session from Flask backend
  const checkAuth = useCallback(async () => {
    const currentToken = getAccessToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(currentToken);
    } catch (err) {
      console.warn('Session verification failed, logging out:', err.message);
      clearTokens();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    const handleForceLogout = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-logout', handleForceLogout);
    return () => window.removeEventListener('auth-logout', handleForceLogout);
  }, [checkAuth]);

  const login = async (email, password, role) => {
    const res = await authService.login(email, password, role);
    const loggedInUser = res.user;
    setUser(loggedInUser);
    setToken(res.access_token);
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res?.user && res?.access_token) {
      setUser(res.user);
      setToken(res.access_token);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const deleteAccount = async () => {
    await authService.deleteAccount();
    setUser(null);
    setToken(null);
  };

  const role = user?.role || 'CLIENT';
  const isAdmin = role === 'ADMIN';
  const isEngineer = role === 'ENGINEER';
  const isClient = role === 'CLIENT' || role === 'VIEWER';
  const isViewer = isClient;
  const canWrite = isAdmin || isEngineer;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: role === 'VIEWER' ? 'CLIENT' : role,
        isAdmin,
        isEngineer,
        isClient,
        isViewer,
        canWrite,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        deleteAccount,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
