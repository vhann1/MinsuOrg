import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const generateNewQR = async () => {
    setLoading(true);
    setTimeout(() => {
      alert('QR Code refreshed!');
      setLoading(false);
    }, 800);
  };

  const renderDashboard = () => (
    <div className="dashboard-content">
      <div className="welcome-area">
        <h1>Hello, {user?.first_name}! 👋</h1>
        <p>Welcome to your student portal</p>
      </div>

      <div className="quick-stats">
        <div className="stat">
          <span className="stat-number">85%</span>
          <span className="stat-label">Attendance</span>
        </div>
        <div className="stat">
          <span className="stat-number">₱0.00</span>
          <span className="stat-label">Balance</span>
        </div>
        <div className="stat">
          <span className="stat-number">12</span>
          <span className="stat-label">Events</span>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-icon">✅</span>
            <div className="activity-details">
              <span className="activity-title">General Assembly</span>
              <span className="activity-time">March 15, 2024 • Present</span>
            </div>
          </div>
          <div className="activity-item">
            <span className="activity-icon">💰</span>
            <div className="activity-details">
              <span className="activity-title">Membership Fee Paid</span>
              <span className="activity-time">March 1, 2024 • ₱50.00</span>
            </div>
          </div>
          <div className="activity-item">
            <span className="activity-icon">📚</span>
            <div className="activity-details">
              <span className="activity-title">Study Session</span>
              <span className="activity-time">March 10, 2024 • Present</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="profile-content">
      <div className="profile-header">
        <div className="user-avatar">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div className="user-info">
          <h2>{user?.first_name} {user?.last_name}</h2>
          <p>{user?.email}</p>
          <span className="student-id">{user?.student_id}</span>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-group">
          <h3>Personal Information</h3>
          <div className="detail-row">
            <label>Full Name</label>
            <span>{user?.first_name} {user?.last_name}</span>
          </div>
          <div className="detail-row">
            <label>Email</label>
            <span>{user?.email}</span>
          </div>
          <div className="detail-row">
            <label>Student ID</label>
            <span>{user?.student_id}</span>
          </div>
          <div className="detail-row">
            <label>Status</label>
            <span className={`status ${user?.is_cleared ? 'cleared' : 'pending'}`}>
              {user?.is_cleared ? 'Active' : 'Pending'}
            </span>
          </div>
        </div>

        <div className="qr-section">
          <h3>Attendance QR Code</h3>
          <div className="qr-container">
            <div className="qr-display">
              <div className="qr-placeholder">
                <span>📱</span>
                <p>Your QR Code</p>
              </div>
            </div>
            <button 
              className="refresh-btn"
              onClick={generateNewQR}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh QR Code'}
            </button>
            <p className="qr-help">Show this code at events for attendance</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      case 'events':
        return (
          <div className="tab-content">
            <h2>My Events</h2>
            <p>View your event schedule and history here.</p>
          </div>
        );
      case 'attendance':
        return (
          <div className="tab-content">
            <h2>Attendance</h2>
            <p>Track your attendance record.</p>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="student-portal">
      <header className="portal-header">
        <div className="header-main">
          <h1>Student Portal</h1>
          <nav className="main-nav">
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
            <button 
              className={`nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance
            </button>
            <button 
              className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </nav>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      <main className="portal-main">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default UserProfile;