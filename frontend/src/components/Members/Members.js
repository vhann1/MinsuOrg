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
  
  // Table states
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentMembersPage, setCurrentMembersPage] = useState(1);
  const [currentNonMembersPage, setCurrentNonMembersPage] = useState(1);
  const [itemsPerPage] = useState(10); // Number of items per page

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

  const addToOrganization = async (userId, isOfficer = true) => {
    try {
      setActionLoading(userId);
      await usersAPI.addToOrganization(userId, { 
        can_scan: true,
        is_officer: true,
        organization_member: true
      });
      await loadMembers();
      alert('User added as officer successfully!');
    } catch (error) {
      console.error('Failed to add member:', error);
      alert(error.response?.data?.message || 'Failed to add member to organization. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const removeFromOrganization = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this officer from the organization?')) {
      return;
    }

    try {
      setActionLoading(userId);
      await usersAPI.removeFromOrganization(userId);
      await loadMembers();
      alert('Officer removed successfully!');
    } catch (error) {
      console.error('Failed to remove officer:', error);
      alert(error.response?.data?.message || 'Failed to remove officer from organization. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleScanPermission = async (userId, canScan) => {
    try {
      setActionLoading(userId);
      await usersAPI.updateScanPermission(userId, { 
        can_scan: !canScan 
      });
      await loadMembers();
      alert('Scan permission updated successfully!');
    } catch (error) {
      console.error('Failed to update scan permission:', error);
      alert(error.response?.data?.message || 'Failed to update scan permission. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const generateNewQR = async (userId) => {
    try {
      setActionLoading(userId);
      await usersAPI.generateQR(userId);
      await loadMembers();
      alert('New QR code generated successfully!');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert(error.response?.data?.message || 'Failed to generate QR code. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter and search functions
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredNonMembers = nonMembers.filter(user => {
    return (
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Pagination functions for members
  const membersStartIndex = (currentMembersPage - 1) * itemsPerPage;
  const membersEndIndex = membersStartIndex + itemsPerPage;
  const currentMembers = filteredMembers.slice(membersStartIndex, membersEndIndex);
  const totalMembersPages = Math.ceil(filteredMembers.length / itemsPerPage);

  // Pagination functions for non-members
  const nonMembersStartIndex = (currentNonMembersPage - 1) * itemsPerPage;
  const nonMembersEndIndex = nonMembersStartIndex + itemsPerPage;
  const currentNonMembers = filteredNonMembers.slice(nonMembersStartIndex, nonMembersEndIndex);
  const totalNonMembersPages = Math.ceil(filteredNonMembers.length / itemsPerPage);

  // Pagination handlers
  const handleMembersPageChange = (pageNumber) => {
    setCurrentMembersPage(pageNumber);
  };

  const handleNonMembersPageChange = (pageNumber) => {
    setCurrentNonMembersPage(pageNumber);
  };

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentMembersPage(1);
    setCurrentNonMembersPage(1);
  }, [searchTerm]);

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
        <p>Loading officers...</p>
      </div>
    );
  }

  return (
    <div className="members-page fade-in">
      {/* Header Section */}
      <div className="page-header slide-up">
        <div className="header-content">
          <h1>Organization Officers</h1>
          <p>Manage organization officers and scanning privileges</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{members.length}</span>
            <span className="stat-label">Current Officers</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">{nonMembers.length}</span>
            <span className="stat-label">Available Users</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">
              {members.filter(m => m.can_scan).length}
            </span>
            <span className="stat-label">Can Scan</span>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="table-controls slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="members-sections">
        {/* Current Officers Table */}
        <section className="members-section slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="section-header">
            <h2>Current Officers ({filteredMembers.length})</h2>
          </div>
          
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No Officers Found</h3>
              <p>{searchTerm ? 'Try adjusting your search' : 'Start by adding users from available users below'}</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Email</th>
                      <th>Scan Privilege</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMembers.map(member => (
                      <tr key={member.id} className="officer-row">
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                            <div className="user-details">
                              <span className="user-name">{member.first_name} {member.last_name}</span>
                              <span className="user-role">Officer</span>
                            </div>
                          </div>
                        </td>
                        <td>{member.student_id}</td>
                        <td>{member.email}</td>
                        <td>
                          <div className="scan-toggle">
                            <button
                              onClick={() => toggleScanPermission(member.id, !member.can_scan)}
                              disabled={actionLoading === member.id}
                              className={`toggle-btn ${member.can_scan ? 'active' : 'inactive'}`}
                            >
                              {actionLoading === member.id ? '...' : (member.can_scan ? '✅ Can Scan' : '❌ Cannot Scan')}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {/* Generate QR Code */}
                            <button
                              onClick={() => generateNewQR(member.id)}
                              disabled={actionLoading === member.id}
                              className="btn-secondary"
                            >
                              {actionLoading === member.id ? '...' : '🔄 QR Code'}
                            </button>
                            
                            {/* Remove Officer */}
                            <button
                              onClick={() => removeFromOrganization(member.id)}
                              disabled={actionLoading === member.id}
                              className="btn-remove"
                            >
                              {actionLoading === member.id ? '...' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination for Members */}
              {totalMembersPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handleMembersPageChange(currentMembersPage - 1)}
                    disabled={currentMembersPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-numbers">
                    {Array.from({ length: totalMembersPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handleMembersPageChange(page)}
                        className={`pagination-number ${currentMembersPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handleMembersPageChange(currentMembersPage + 1)}
                    disabled={currentMembersPage === totalMembersPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Available Users Table */}
        <section className="members-section slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="section-header">
            <h2>Available Users ({filteredNonMembers.length})</h2>
          </div>

          {filteredNonMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>All Users Added</h3>
              <p>All registered users are already organization officers.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentNonMembers.map(user => (
                      <tr key={user.id} className="non-member-row">
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div className="user-details">
                              <span className="user-name">{user.first_name} {user.last_name}</span>
                            </div>
                          </div>
                        </td>
                        <td>{user.student_id}</td>
                        <td>{user.email}</td>
                        <td>
                          <div className="add-buttons">
                            <button
                              onClick={() => addToOrganization(user.id)}
                              disabled={actionLoading === user.id}
                              className="btn-add-officer"
                            >
                              {actionLoading === user.id ? 'Adding...' : 'Add as Officer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination for Non-Members */}
              {totalNonMembersPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handleNonMembersPageChange(currentNonMembersPage - 1)}
                    disabled={currentNonMembersPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-numbers">
                    {Array.from({ length: totalNonMembersPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handleNonMembersPageChange(page)}
                        className={`pagination-number ${currentNonMembersPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handleNonMembersPageChange(currentNonMembersPage + 1)}
                    disabled={currentNonMembersPage === totalNonMembersPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Members;