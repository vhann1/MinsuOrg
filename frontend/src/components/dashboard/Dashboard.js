import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading real dashboard data from API...');
      
      const response = await dashboardAPI.getDashboardData();
      console.log('Dashboard API response:', response.data);
      
      setStats(response.data);

    } catch (error) {
      console.error('Dashboard API Error:', error);
      setError(`Backend Error: ${error.response?.data?.message || error.message}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={loadDashboardData}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.first_name}</h1>
          <p className="welcome-subtitle">
            {user?.is_officer 
              ? "Organization Management Dashboard" 
              : "Your Personal Dashboard"
            }
          </p>
        </div>
        <div className="user-badge">
          <div className="badge-icon">{user?.is_officer ? '🏆' : '👤'}</div>
          <div className="badge-info">
            <span className="badge-role">{user?.is_officer ? 'Officer' : 'Member'}</span>
            <span className="badge-org">{user?.organization?.name || 'Organization'}</span>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="stats-section">
        {user?.is_officer ? (
          <div className="admin-stats">
            <StatCard 
              icon="👥" 
              title="Total Members" 
              value={stats.stats?.total_members || 0}
              subtitle="Organization members"
            />
            <StatCard 
              icon="📆" 
              title="Active Events" 
              value={stats.stats?.active_events || 0}
              subtitle="Currently running"
            />
            <StatCard 
              icon="💱" 
              title="Pending Payments" 
              value={`₱${(stats.financial_overview?.total_balance || 0).toLocaleString()}`}
              subtitle="Outstanding balances"
            />
            <StatCard 
              icon="📈" 
              title="Attendance Rate" 
              value={`${(stats.attendance_summary?.attendance_rate || 0).toFixed(1)}%`}
              subtitle="Overall participation"
            />
          </div>
        ) : (
          <div className="user-stats">
            <StatCard 
              icon="💳" 
              title="My Balance" 
              value={`₱${Math.abs(stats.user_data?.current_balance || 0).toLocaleString()}`}
              subtitle={stats.user_data?.current_balance >= 0 ? "Available funds" : "Amount due"}
            />
            <StatCard 
              icon="📈" 
              title="My Attendance" 
              value={`${(stats.user_data?.attendance_stats?.attendance_rate || 0).toFixed(1)}%`}
              subtitle="Event participation"
            />
            <StatCard 
              icon="📆" 
              title="Upcoming Events" 
              value={stats.user_data?.upcoming_events?.length || 0}
              subtitle="Your events"
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          {user?.is_officer ? (
            <>
              <ActionCard 
                icon="👥" 
                title="Manage Members" 
                description="View and manage organization members"
                path="/admin/members"
                iconBg="#2E8B57"
              />
              <ActionCard 
                icon="📅" 
                title="Create Event" 
                description="Schedule new events and activities"
                path="/admin/events"
                iconBg="#9b59b6"
              />
              <ActionCard 
                icon="📋" 
                title="Attendance" 
                description="Track event attendance and scans"
                path="/admin/attendance"
                iconBg="#3498db"
              />
              <ActionCard 
                icon="💰" 
                title="Financials" 
                description="Manage payments and finances"
                path="/admin/financial"
                iconBg="#e74c3c"
              />
            </>
          ) : (
            <>
              <ActionCard 
                icon="📱" 
                title="My QR Code" 
                description="Access your attendance QR code"
                path="/profile"
                iconBg="#3498db"
              />
              <ActionCard 
                icon="💳" 
                title="My Balance" 
                description="View payment history and balance"
                path="/financial"
                iconBg="#27ae60"
              />
              <ActionCard 
                icon="🎯" 
                title="Events" 
                description="Browse and register for events"
                path="/events"
                iconBg="#9b59b6"
              />
              <ActionCard 
                icon="✔️" 
                title="Attendance" 
                description="Check your attendance records"
                path="/attendance"
                iconBg="#f39c12"
              />
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {user?.is_officer ? (
            <>
              {stats.financial_overview?.recent_transactions && stats.financial_overview.recent_transactions.length > 0 ? (
                stats.financial_overview.recent_transactions.map((transaction) => (
                  <ActivityItem 
                    key={transaction.id}
                    icon="💰"
                    description={`${transaction.type}: ${transaction.description}`}
                    info={`${transaction.user?.first_name} ${transaction.user?.last_name}`}
                    timestamp={transaction.created_at}
                  />
                ))
              ) : (
                <div className="no-activity">
                  <p>No recent financial activity</p>
                </div>
              )}
            </>
          ) : (
            <>
              {stats.user_data?.upcoming_events && stats.user_data.upcoming_events.length > 0 ? (
                stats.user_data.upcoming_events.map((event) => (
                  <ActivityItem 
                    key={event.id}
                    icon="📅"
                    description={`Upcoming: ${event.title}`}
                    info={event.start_time}
                  />
                ))
              ) : (
                <div className="no-activity">
                  <p>No upcoming events</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// StatCard Component
const StatCard = ({ icon, title, value, subtitle }) => (
  <div className="stat-card">
    <div className="stat-icon">
      {icon}
    </div>
    <div className="stat-info">
      <h3>{title}</h3>
      <div className="stat-value-row">
        <span className="stat-number">{value}</span>
      </div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  </div>
);

// ActionCard Component
const ActionCard = ({ icon, title, description, path, iconBg }) => {
  const navigate = useNavigate();
  
  return (
    <button
      className="action-card" 
      onClick={() => navigate(path)}
      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
    >
      <div className="action-icon" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div className="action-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="action-arrow">→</div>
    </button>
  );
};

// ActivityItem Component
const ActivityItem = ({ icon, description, info, timestamp }) => (
  <div className="activity-item">
    <div className="activity-icon">{icon}</div>
    <div className="activity-details">
      <p className="activity-description">{description}</p>
      <div className="activity-meta">
        <span className="activity-info">{info}</span>
        {timestamp && (
          <span className="activity-time">
            {new Date(timestamp).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default Dashboard;