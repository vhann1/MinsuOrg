import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI, usersAPI, eventsAPI, financialAPI } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeEvents: 0,
    pendingPayments: 0,
    attendanceRate: 0,
    recentMembers: [],
    upcomingEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load real data first
      const [membersRes, eventsRes, financialRes] = await Promise.all([
        usersAPI.getOrganizationMembers().catch(() => ({ data: { members: [] } })),
        eventsAPI.getActiveEvents().catch(() => ({ data: [] })),
        financialAPI.getFinancialOverview().catch(() => ({ data: { total_pending: 0 } }))
      ]);

      const members = membersRes.data.members || [];
      const activeEvents = eventsRes.data || [];
      const recentMembers = members.slice(0, 5);

      setStats({
        totalMembers: members.length,
        activeEvents: activeEvents.length,
        pendingPayments: financialRes.data.total_pending || 0,
        attendanceRate: calculateAttendanceRate(members),
        recentMembers,
        upcomingEvents: activeEvents.slice(0, 3)
      });

    } catch (error) {
      console.error('Dashboard data error:', error);
      setError('Using demo data - API connection issues');
      // Fallback to meaningful demo data
      setStats({
        totalMembers: 24,
        activeEvents: 3,
        pendingPayments: 1250,
        attendanceRate: 78,
        recentMembers: [
          { id: 1, first_name: 'Juan', last_name: 'Dela Cruz', student_id: '2024-001' },
          { id: 2, first_name: 'Maria', last_name: 'Santos', student_id: '2024-002' }
        ],
        upcomingEvents: [
          { id: 1, name: 'General Assembly', date: '2024-03-30' },
          { id: 2, name: 'Sports Fest', date: '2024-04-05' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = (members) => {
    return members.length > 0 ? 78 : 0; // Replace with real calculation
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {user?.first_name}! 👋</h1>
          <p>
            {user?.is_officer 
              ? "Here's what's happening in your organization today" 
              : "Manage your organization activities and track your progress"
            }
          </p>
          {error && (
            <div className="demo-notice">
              <small>⚠️ {error}</small>
            </div>
          )}
        </div>
        <div className="user-badge">
          <div className="badge-icon">{user?.is_officer ? '👑' : '👤'}</div>
          <div className="badge-info">
            <span className="badge-role">{user?.is_officer ? 'Officer' : 'Member'}</span>
            <span className="badge-org">{user?.organization?.name}</span>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatCard 
          icon="👥" 
          title="Total Members" 
          value={stats.totalMembers}
          subtitle="Organization members"
          color="#3498db"
        />
        <StatCard 
          icon="📅" 
          title="Active Events" 
          value={stats.activeEvents}
          subtitle="Currently running"
          color="#9b59b6"
        />
        <StatCard 
          icon="💰" 
          title="Pending Payments" 
          value={`₱${stats.pendingPayments.toLocaleString()}`}
          subtitle="Outstanding balances"
          color="#e74c3c"
        />
        <StatCard 
          icon="📊" 
          title="Attendance Rate" 
          value={`${stats.attendanceRate}%`}
          subtitle="Overall participation"
          color="#27ae60"
        />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          {user?.is_officer ? (
            <>
              <ActionButton icon="👥" label="Manage Members" path="/members" />
              <ActionButton icon="📅" label="Create Event" path="/events" />
              <ActionButton icon="📱" label="Attendance" path="/attendance" />
              <ActionButton icon="💰" label="Financials" path="/financial" />
            </>
          ) : (
            <>
              <ActionButton icon="📱" label="My QR Code" path="/profile" />
              <ActionButton icon="💰" label="My Balance" path="/financial" />
              <ActionButton icon="📅" label="Events" path="/events" />
              <ActionButton icon="✅" label="Attendance" path="/attendance" />
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-sections">
        <div className="recent-section">
          <h3>Recent Members</h3>
          <div className="recent-list">
            {stats.recentMembers.map(member => (
              <RecentMember key={member.id} member={member} />
            ))}
          </div>
        </div>

        <div className="upcoming-section">
          <h3>Upcoming Events</h3>
          <div className="events-list">
            {stats.upcomingEvents.map(event => (
              <UpcomingEvent key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Stat Card
const StatCard = ({ icon, title, value, subtitle, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="stat-content">
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  </div>
);

// Component: Action Button
const ActionButton = ({ icon, label, path }) => (
  <button 
    className="action-button" 
    onClick={() => window.location.href = path}
  >
    <span className="action-icon">{icon}</span>
    <span className="action-label">{label}</span>
  </button>
);

// Component: Recent Member
const RecentMember = ({ member }) => (
  <div className="recent-item">
    <div className="member-avatar">
      {member.first_name?.[0]}{member.last_name?.[0]}
    </div>
    <div className="member-info">
      <span className="member-name">{member.first_name} {member.last_name}</span>
      <span className="member-id">{member.student_id}</span>
    </div>
  </div>
);

// Component: Upcoming Event
const UpcomingEvent = ({ event }) => (
  <div className="event-item">
    <div className="event-date">
      {new Date(event.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}
    </div>
    <div className="event-info">
      <span className="event-name">{event.name}</span>
    </div>
  </div>
);

export default Dashboard;