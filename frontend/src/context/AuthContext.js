import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, initializeCSRF } from '../services/api'; // Remove usersAPI import

// Create axios instance for direct API calls
const api = require('../services/api').default;

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

  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initializeCSRF();
        await checkAuthStatus();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      // FIX: Use the correct endpoint that matches your Laravel routes
      const response = await api.get('/api/user'); // Now 'api' is defined
      
      console.log('Auth check response:', response.data);
      
      if (response.data.user) {
        setUser(response.data.user);
        console.log('User authenticated:', response.data.user.email);
      } else {
        setUser(null);
        console.log('No user data in response');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    }
  };

  const login = async (credentials) => {
    try {
      console.log('Starting login process...');
      const response = await authAPI.login(credentials);
      
      console.log('Login response data:', response.data);
      
      if (response.data.user) {
        setUser(response.data.user);
        console.log('Login successful:', response.data.user.email);
        
        // FIX: Return the user data for proper redirection
        return {
          user: response.data.user,
          message: response.data.message
        };
      } else {
        throw new Error('No user data in response');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // FIX: Better error handling
      if (error.response?.data?.errors) {
        throw new Error(Object.values(error.response.data.errors).flat().join(', '));
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      console.log('Logout complete, redirecting to login...');
      // Use window.location for logout to clear everything
      window.location.href = '/login';
    }
  };

  const register = async (userData) => {
    try {
      console.log('Starting registration...');
      const response = await authAPI.register(userData);
      console.log('Registration successful');
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      
      // FIX: Better error handling for registration
      if (error.response?.data?.errors) {
        throw new Error(Object.values(error.response.data.errors).flat().join(', '));
      }
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    register,
    loading,
    checkAuthStatus // Export for manual refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;