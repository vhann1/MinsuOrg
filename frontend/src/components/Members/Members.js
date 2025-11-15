// src/components/Members/Members.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import './Members.css';

const Members = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [nonMembers, setNonMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (user?.is_officer) {
      loadMembers();
    }
  }, [user]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getOrganizationMembers();
      setMembers(response.data.members || []);
      setNonMembers(response.data.non_members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToOrganization = async (userId, grantScanPermission = false) => {
    try {
      setActionLoading(userId);
      await usersAPI.addToOrganization(userId, { can_scan: grantScanPermission });
      await loadMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member to organization. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const removeFromOrganization = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }

    try {
      setActionLoading(userId);
      await usersAPI.removeFromOrganization(userId);
      await loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member from organization. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const updateScanPermission = async (userId, canScan) => {
    try {
      setActionLoading(userId);
      await usersAPI.updateScanPermission(userId, { can_scan: canScan });
      await loadMembers();
    } catch (error) {
      console.error('Failed to update scan permission:', error);
      alert('Failed to update scan permission. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const generateNewQR = async (userId) => {
    try {
      setActionLoading(userId);
      await usersAPI.generateQR(userId);
      alert('New QR code generated successfully!');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user?.is_officer) {
    return (
      <div className="access-denied fade-in">
        <div className="denied-content">
          <div className="denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Officer privileges are required to manage organization members.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="members-loading">
        <div className="loading-spinner"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="members-page fade-in">
      {/* Header Section */}
      <div className="page-header slide-up">
        <div className="header-content">
          <h1>Organization Members</h1>
          <p>Manage organization membership and QR scanning privileges</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{members.length}</span>
            <span className="stat-label">Current Members</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">{nonMembers.length}</span>
            <span className="stat-label">Available Users</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">
              {members.filter(m => m.can_scan).length}
            </span>
            <span className="stat-label">QR Scanners</span>
          </div>
        </div>
      </div>

      <div className="members-sections">
        {/* Current Members Section */}
        <section className="members-section slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <h2>Current Members</h2>
            <span className="section-count">{members.length} members</span>
          </div>
          
          {members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Members Yet</h3>
              <p>Start by adding users from the available users section below.</p>
            </div>
          ) : (
            <div className="members-grid">
              {members.map(member => (
                <div key={member.id} className="member-card">
                  <div className="member-avatar">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  
                  <div className="member-info">
                    <h3>{member.first_name} {member.last_name}</h3>
                    <p className="member-email">{member.email}</p>
                    <p className="member-id">ID: {member.student_id}</p>
                    
                    <div className="member-badges">
                      <span className={`badge role ${member.is_officer ? 'officer' : 'member'}`}>
                        {member.is_officer ? '👑 Officer' : '👤 Member'}
                      </span>
                      <span className={`badge scan ${member.can_scan ? 'scanner' : 'no-scan'}`}>
                        {member.can_scan ? '📱 Scanner' : '👀 Viewer'}
                      </span>
                    </div>
                  </div>

                  <div className="member-actions">
                    {/* Scan Permission Toggle */}
                    <div className="toggle-group">
                      <label className="toggle-label">QR Scanning</label>
                      <button
                        onClick={() => updateScanPermission(member.id, !member.can_scan)}
                        disabled={actionLoading === member.id}
                        className={`toggle-btn ${member.can_scan ? 'active' : 'inactive'}`}
                      >
                        {actionLoading === member.id ? '...' : (member.can_scan ? 'ON' : 'OFF')}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                      <button
                        onClick={() => generateNewQR(member.id)}
                        disabled={actionLoading === member.id}
                        className="btn-secondary"
                      >
                        {actionLoading === member.id ? 'Generating...' : '🔄 QR Code'}
                      </button>
                      
                      <button
                        onClick={() => removeFromOrganization(member.id)}
                        disabled={actionLoading === member.id}
                        className="btn-danger"
                      >
                        {actionLoading === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Available Users Section */}
        <section className="members-section slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="section-header">
            <h2>Available Users</h2>
            <span className="section-count">{nonMembers.length} users</span>
          </div>

          {nonMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All Users Added</h3>
              <p>All registered users are already organization members.</p>
            </div>
          ) : (
            <div className="members-grid">
              {nonMembers.map(user => (
                <div key={user.id} className="member-card pending">
                  <div className="member-avatar pending">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  
                  <div className="member-info">
                    <h3>{user.first_name} {user.last_name}</h3>
                    <p className="member-email">{user.email}</p>
                    <p className="member-id">ID: {user.student_id}</p>
                    
                    <div className="member-badges">
                      <span className="badge pending">Pending Member</span>
                      {user.is_officer && (
                        <span className="badge officer">👑 Officer</span>
                      )}
                    </div>
                  </div>

                  <div className="member-actions">
                    <div className="add-options">
                      <p className="option-label">Add as:</p>
                      <div className="option-buttons">
                        <button
                          onClick={() => addToOrganization(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="btn-add-member"
                        >
                          {actionLoading === user.id ? 'Adding...' : '👤 Member'}
                        </button>
                        <button
                          onClick={() => addToOrganization(user.id, true)}
                          disabled={actionLoading === user.id}
                          className="btn-add-scanner"
                        >
                          {actionLoading === user.id ? 'Adding...' : '📱 Scanner'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick Actions Footer */}
      <div className="quick-actions-footer slide-up" style={{ animationDelay: '0.3s' }}>
        <h3>Quick Actions</h3>
        <div className="action-buttons-grid">
          <button 
            className="action-btn primary"
            onClick={() => window.location.href = '/users?create=new'}
          >
            ➕ Create New User
          </button>
          <button 
            className="action-btn secondary"
            onClick={loadMembers}
          >
            🔄 Refresh List
          </button>
          <button 
            className="action-btn info"
            onClick={() => window.location.href = '/attendance'}
          >
            📱 Manage Scanners
          </button>
        </div>
      </div>
    </div>
  );
};

export default Members;