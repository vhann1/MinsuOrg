// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/authAPI';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fetch CSRF token when app starts
    const initializeApp = async () => {
      try {
        await authAPI.ensureCsrf();
        await checkAuth();
      } catch (err) {
        console.log('App initialization failed:', err);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      setError('');
      console.log('User authenticated:', response.data.user.email);
    } catch (err) {
      // Silent fail for 401 - it's normal when not logged in
      if (err.response?.status !== 401) {
        console.error('Auth check error:', err);
      }
      setUser(null);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError('');
      const response = await authAPI.login(credentials);
      setUser(response.data.user);
      return { success: true };
    } catch (err) {
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.response?.status === 419) {
        errorMessage = 'Session expired. Please try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError('');
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isOfficer: user?.is_officer || false,
    organization: user?.organization
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;