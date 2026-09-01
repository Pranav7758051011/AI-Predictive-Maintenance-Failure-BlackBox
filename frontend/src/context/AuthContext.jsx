import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { getAccessToken, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
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
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const loggedInUser = res.user;
    setUser(loggedInUser);
    setToken(res.access_token);
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const role = user?.role || 'VIEWER';
  const isAdmin = role === 'ADMIN';
  const isEngineer = role === 'ENGINEER';
  const isViewer = role === 'VIEWER';
  const canWrite = isAdmin || isEngineer;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAdmin,
        isEngineer,
        isViewer,
        canWrite,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser: checkAuth
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
