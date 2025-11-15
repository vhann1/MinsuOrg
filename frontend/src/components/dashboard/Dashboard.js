// src/components/dashboard/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    activeEvents: 0,
    pendingBalances: 0,
    totalScanners: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use mock data for now since APIs are failing
      const mockData = {
        totalMembers: user?.is_officer ? 24 : 1,
        activeEvents: 3,
        pendingBalances: user?.is_officer ? 1250 : (user?.current_balance || 0),
        totalScanners: user?.is_officer ? 5 : 0,
        recentActivity: [
          {
            type: 'payment',
            description: 'Semester dues payment',
            amount: 500,
            user: { first_name: 'John', last_name: 'Doe' }
          },
          {
            type: 'fine',
            description: 'Event absence fine',
            amount: 100,
            user: { first_name: 'Jane', last_name: 'Smith' }
          }
        ]
      };

      setDashboardData(mockData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Using demo data.');
      
      // Fallback to demo data
      const demoData = {
        totalMembers: user?.is_officer ? 24 : 1,
        activeEvents: 3,
        pendingBalances: user?.is_officer ? 1250 : (user?.current_balance || 0),
        totalScanners: user?.is_officer ? 5 : 0,
        recentActivity: []
      };
      
      setDashboardData(demoData);
    } finally {
      setLoading(false);
    }
  }, [user?.is_officer, user?.current_balance]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      {/* Header Section */}
      <div className="dashboard-header slide-up">
        <div className="welcome-section">
          <h1>Welcome back, {user?.first_name}! 👋</h1>
          <p className="welcome-subtitle">
            {user?.is_officer 
              ? "Here's what's happening in your organization today" 
              : "Manage your organization activities and track your progress"
            }
          </p>
          {error && (
            <div className="demo-notice">
              <small>⚠️ Showing demo data - API connection issues</small>
            </div>
          )}
        </div>
        <div className="user-badge">
          <div className="badge-icon">
            {user?.is_officer ? '👑' : '👤'}
          </div>
          <div className="badge-info">
            <span className="badge-role">{user?.is_officer ? 'Organization Officer' : 'Member'}</span>
            <span className="badge-org">{user?.organization?.name}</span>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="stats-section">
        {user?.is_officer ? (
          <div className="admin-stats">
            <div className="stat-card slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon members">👥</div>
              <div className="stat-info">
                <h3>Total Members</h3>
                <span className="stat-number">{dashboardData.totalMembers}</span>
                <span className="stat-subtitle">Organization members</span>
              </div>
            </div>
            
            <div className="stat-card slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon events">📅</div>
              <div className="stat-info">
                <h3>Active Events</h3>
                <span className="stat-number">{dashboardData.activeEvents}</span>
                <span className="stat-subtitle">Currently running</span>
              </div>
            </div>
            
            <div className="stat-card slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon financial">💰</div>
              <div className="stat-info">
                <h3>Pending Balances</h3>
                <span className="stat-number">₱{dashboardData.pendingBalances.toLocaleString()}</span>
                <span className="stat-subtitle">Total outstanding</span>
              </div>
            </div>
            
            <div className="stat-card slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="stat-icon scanners">📱</div>
              <div className="stat-info">
                <h3>QR Scanners</h3>
                <span className="stat-number">{dashboardData.totalScanners}</span>
                <span className="stat-subtitle">Active scanners</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="user-stats">
            <div className="stat-card slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon balance">💰</div>
              <div className="stat-info">
                <h3>My Balance</h3>
                <span className={`stat-number ${dashboardData.pendingBalances > 0 ? 'negative' : 'positive'}`}>
                  ₱{Math.abs(dashboardData.pendingBalances).toLocaleString()}
                </span>
                <span className="stat-subtitle">
                  {dashboardData.pendingBalances > 0 ? 'Amount due' : 'All clear!'}
                </span>
              </div>
            </div>
            
            <div className="stat-card slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon attendance">✅</div>
              <div className="stat-info">
                <h3>Events Attended</h3>
                <span className="stat-number">0</span>
                <span className="stat-subtitle">This semester</span>
              </div>
            </div>
            
            <div className="stat-card slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon upcoming">📅</div>
              <div className="stat-info">
                <h3>Upcoming Events</h3>
                <span className="stat-number">{dashboardData.activeEvents}</span>
                <span className="stat-subtitle">Scheduled events</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="actions-section slide-up" style={{ animationDelay: '0.5s' }}>
        <h2>Quick Actions</h2>
        <div className="action-grid">
          {user?.is_officer ? (
            <>
              <ActionCard 
                icon="👥" 
                title="Manage Members" 
                description="Add or remove organization members"
                onClick={() => window.location.href = '/members'}
                color="var(--primary-green)"
              />
              <ActionCard 
                icon="📅" 
                title="Create Event" 
                description="Schedule new organization event"
                onClick={() => window.location.href = '/events'}
                color="var(--primary-dark)"
              />
              <ActionCard 
                icon="📊" 
                title="View Attendance" 
                description="Check event attendance records"
                onClick={() => window.location.href = '/attendance'}
                color="var(--primary-light)"
              />
              <ActionCard 
                icon="💰" 
                title="Financial Overview" 
                description="Manage payments and balances"
                onClick={() => window.location.href = '/financial'}
                color="var(--accent-green)"
              />
            </>
          ) : (
            <>
              <ActionCard 
                icon="📱" 
                title="My QR Code" 
                description="View your attendance QR code"
                onClick={() => window.location.href = '/profile'}
                color="var(--primary-green)"
              />
              <ActionCard 
                icon="💰" 
                title="Check Balance" 
                description="View your current balance"
                onClick={() => window.location.href = '/financial'}
                color="var(--primary-dark)"
              />
              <ActionCard 
                icon="📅" 
                title="Upcoming Events" 
                description="View scheduled events"
                onClick={() => window.location.href = '/events'}
                color="var(--primary-light)"
              />
              <ActionCard 
                icon="✅" 
                title="My Attendance" 
                description="View attendance history"
                onClick={() => window.location.href = '/attendance'}
                color="var(--accent-green)"
              />
            </>
          )}
        </div>
      </div>

      {/* Recent Activity Section (Admin Only) */}
      {user?.is_officer && dashboardData.recentActivity.length > 0 && (
        <div className="recent-activity slide-up" style={{ animationDelay: '0.6s' }}>
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'payment' ? '💰' : '📝'}
                </div>
                <div className="activity-details">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-user">
                    {activity.user?.first_name} {activity.user?.last_name}
                  </span>
                </div>
                <div className="activity-amount">
                  <span className={`amount ${activity.type === 'payment' ? 'positive' : 'negative'}`}>
                    {activity.type === 'payment' ? '+' : '-'}₱{Math.abs(activity.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Action Card Component
const ActionCard = ({ icon, title, description, onClick, color }) => (
  <div className="action-card" onClick={onClick} style={{ borderLeftColor: color }}>
    <div className="action-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="action-content">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <div className="action-arrow">→</div>
  </div>
);

export default Dashboard;