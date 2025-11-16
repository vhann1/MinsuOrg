// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/auth/Login/Login';
import Dashboard from './components/dashboard/Dashboard';
import Members from './components/Members/Members';
import Events from './components/Events/Events';
import Attendance from './components/Attendance/Attendance';
import Financial from './components/Financial/Financial';
import Calendar from './components/Calendar/Calendar';
import Settings from './components/Settings/Settings';
import Register from './components/auth/Register/Register';
import UserProfile from './components/UserProfile/UserProfile';

import './App.css';

// Protected Route for OFFICERS (with Layout)
const OfficerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Only officers get the admin layout
  const isOfficer = user.is_officer || user.role === 'officer' || user.role === 'admin';
  
  return isOfficer ? <Layout>{children}</Layout> : <Navigate to="/user-profile" />;
};

// Protected Route for STUDENTS (without Layout)
const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Students get the plain component without admin layout
  const isStudent = !user.is_officer && user.role !== 'officer' && user.role !== 'admin';
  
  return isStudent ? children : <Navigate to="/dashboard" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* OFFICER ONLY ROUTES (with Layout) */}
            <Route 
              path="/dashboard" 
              element={
                <OfficerRoute>
                  <Dashboard />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/members" 
              element={
                <OfficerRoute>
                  <Members />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/events" 
              element={
                <OfficerRoute>
                  <Events />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <OfficerRoute>
                  <Attendance />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/financial" 
              element={
                <OfficerRoute>
                  <Financial />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <OfficerRoute>
                  <Calendar />
                </OfficerRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <OfficerRoute>
                  <Settings />
                </OfficerRoute>
              } 
            />
            
            {/* STUDENT ONLY ROUTE (without Layout) */}
            <Route 
              path="/user-profile" 
              element={
                <StudentRoute>
                  <UserProfile />
                </StudentRoute>
              } 
            />
            
            <Route path="/register" element={<Register />} />
            
            {/* SMART ROOT REDIRECT */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Smart redirect based on user role
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Redirect based on role
  const isOfficer = user.is_officer || user.role === 'officer' || user.role === 'admin';
  
  return isOfficer ? <Navigate to="/dashboard" /> : <Navigate to="/user-profile" />;
};

export default App;