// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
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

// Protected Route for ADMIN ONLY (with Layout) - Can access dashboard & user management only
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Only admins get the admin layout (is_officer must be true)
  const isAdmin = user.is_officer === true;
  
  return isAdmin ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

// Protected Route for STUDENTS/OFFICERS to access UserProfile (for scanning)
const UserProfileRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Both students and officers can access user profile (officers can scan here)
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  // IMPORTANT: Never redirect during loading. Wait for auth check to complete.
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
      </div>
    );
  }
  
  // Only redirect after loading is complete and user exists
  if (user) {
    const isAdmin = user.is_officer === true;
    return <Navigate to={isAdmin ? "/dashboard" : "/user-profile"} />;
  }
  
  // Allow access to login/register if not authenticated
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
            
            {/* ADMIN ONLY ROUTES (with Layout) */}
            <Route 
              path="/dashboard" 
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/members" 
              element={
                <AdminRoute>
                  <Members />
                </AdminRoute>
              } 
            />
            <Route 
              path="/events" 
              element={
                <AdminRoute>
                  <Events />
                </AdminRoute>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <AdminRoute>
                  <Attendance />
                </AdminRoute>
              } 
            />
            <Route 
              path="/financial" 
              element={
                <AdminRoute>
                  <Financial />
                </AdminRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <AdminRoute>
                  <Calendar />
                </AdminRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              } 
            />
            
            {/* STUDENT & OFFICER ROUTE (UserProfile with camera scanning) */}
            <Route 
              path="/user-profile" 
              element={
                <UserProfileRoute>
                  <UserProfile />
                </UserProfileRoute>
              } 
            />
            
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* SMART ROOT REDIRECT */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
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
  
  // Admin goes to dashboard, students/others go to user-profile
  const isAdmin = user.is_officer === true;
  return isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/user-profile" />;
};

export default App;