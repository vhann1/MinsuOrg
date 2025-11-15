// src/components/Financial/Financial.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Financial.css';

// Add the missing API imports
import { financialAPI } from '../../services/api';

const Financial = () => {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLedger, setMemberLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [fineData, setFineData] = useState({
    amount: '',
    description: '',
    fine_date: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState('organization'); // 'organization' or 'member'

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const response = await financialAPI.getOrganizationFinancials();
      // Data is already sorted by balance from the backend
      setLedgers(response.data.ledgers || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberLedger = async (memberId) => {
    try {
      setActionLoading(memberId);
      const endpoint = user?.is_officer ? 
        financialAPI.getStudentLedger : 
        financialAPI.getMemberLedger;
      
      const response = await endpoint(memberId);
      setMemberLedger(response.data.ledger || []);
      setSelectedMember(response.data.user || ledgers.find(l => l.id === memberId));
      setViewMode('member');
    } catch (error) {
      console.error('Error fetching member ledger:', error);
      alert('Failed to load member ledger. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('payment');
      await financialAPI.makePayment({
        user_id: selectedMember.id,
        amount: parseFloat(paymentData.amount),
        description: paymentData.description || 'Payment received',
        payment_date: paymentData.payment_date
      });
      
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      await loadFinancialData();
      if (viewMode === 'member') {
        await loadMemberLedger(selectedMember.id);
      }
      
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyFine = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('fine');
      await financialAPI.applyAbsenceFine({
        user_id: selectedMember.id,
        fine_amount: parseFloat(fineData.amount),
        event_name: fineData.description || 'Manual fine'
      });
      
      setShowFineModal(false);
      setFineData({
        amount: '',
        description: '',
        fine_date: new Date().toISOString().split('T')[0]
      });
      
      await loadFinancialData();
      if (viewMode === 'member') {
        await loadMemberLedger(selectedMember.id);
      }
      
      alert('Fine applied successfully!');
    } catch (error) {
      console.error('Fine application failed:', error);
      alert('Failed to apply fine. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // REMOVED the unused handleAddManualEntry function

  const getStatusBadge = (balance) => {
    if (balance <= 0) {
      return { text: 'CLEARED', class: 'cleared' };
    } else if (balance > 500) {
      return { text: 'HIGH BALANCE', class: 'high-balance' };
    } else {
      return { text: 'PENDING', class: 'pending' };
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      fine: { class: 'badge-fine', icon: '⚡' },
      payment: { class: 'badge-payment', icon: '💰' },
      due: { class: 'badge-due', icon: '📝' },
      adjustment: { class: 'badge-adjustment', icon: '🔧' }
    };
    return badges[type] || { class: 'badge-secondary', icon: '📋' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="financial-loading">
        <div className="loading-spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="financial-page fade-in">
      {/* Header Section */}
      <div className="page-header slide-up">
        <div className="header-content">
          <h1>Financial Ledger</h1>
          <p>Manage member balances, payments, and financial records</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{ledgers.length}</span>
            <span className="stat-label">Total Members</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">
              {ledgers.filter(l => l.current_balance > 0).length}
            </span>
            <span className="stat-label">With Balance</span>
          </div>
          <div className="stat-badge">
            <span className="stat-number">
              {formatCurrency(ledgers.reduce((sum, l) => sum + (l.current_balance > 0 ? l.current_balance : 0), 0))}
            </span>
            <span className="stat-label">Total Pending</span>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle slide-up" style={{ animationDelay: '0.1s' }}>
        <button 
          className={`toggle-btn ${viewMode === 'organization' ? 'active' : ''}`}
          onClick={() => setViewMode('organization')}
        >
          👥 Organization View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'member' ? 'active' : ''}`}
          onClick={() => setViewMode('member')}
          disabled={!selectedMember}
        >
          👤 Member Details
        </button>
      </div>

      {/* Organization Financial Overview */}
      {viewMode === 'organization' && (
        <div className="organization-view slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="section-header">
            <h2>Member Balances</h2>
            <p>Sorted by highest balance first</p>
          </div>

          {ledgers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <h3>No Financial Data</h3>
              <p>Financial records will appear here as transactions occur.</p>
            </div>
          ) : (
            <div className="ledger-table">
              <div className="table-header">
                <div className="col-member">Member</div>
                <div className="col-balance">Balance</div>
                <div className="col-status">Status</div>
                <div className="col-actions">Actions</div>
              </div>

              <div className="table-body">
                {ledgers.map((member, index) => {
                  const status = getStatusBadge(member.current_balance);
                  const isHighPriority = member.current_balance > 0;
                  
                  return (
                    <div 
                      key={member.id} 
                      className={`table-row ${isHighPriority ? 'has-balance' : 'cleared'} ${index < 3 ? 'top-balance' : ''}`}
                    >
                      <div className="col-member">
                        <div className="member-avatar">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div className="member-details">
                          <h4>{member.first_name} {member.last_name}</h4>
                          <p className="member-email">{member.email}</p>
                          <p className="member-id">ID: {member.student_id}</p>
                        </div>
                      </div>

                      <div className="col-balance">
                        <span className={`balance-amount ${member.current_balance > 0 ? 'negative' : 'positive'}`}>
                          {formatCurrency(Math.abs(member.current_balance))}
                        </span>
                        {member.current_balance > 0 && (
                          <span className="balance-label">
                            {member.current_balance > 0 ? 'Amount Due' : 'Credit'}
                          </span>
                        )}
                      </div>

                      <div className="col-status">
                        <span className={`status-badge ${status.class}`}>
                          {status.text}
                        </span>
                        {member.ledger_entries_count > 0 && (
                          <span className="entries-count">
                            {member.ledger_entries_count} entries
                          </span>
                        )}
                      </div>

                      <div className="col-actions">
                        <div className="action-buttons">
                          <button
                            onClick={() => loadMemberLedger(member.id)}
                            disabled={actionLoading === member.id}
                            className="btn-view"
                          >
                            {actionLoading === member.id ? '...' : '📊 View'}
                          </button>
                          
                          {user?.is_officer && member.current_balance > 0 && (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowPaymentModal(true);
                              }}
                              className="btn-pay"
                            >
                              💳 Pay
                            </button>
                          )}
                          
                          {user?.is_officer && (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowFineModal(true);
                              }}
                              className="btn-fine"
                            >
                              ⚡ Fine
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Ledger Details */}
      {viewMode === 'member' && selectedMember && (
        <div className="member-view slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="member-header">
            <button 
              className="btn-back"
              onClick={() => setViewMode('organization')}
            >
              ← Back to Organization
            </button>
            
            <div className="member-summary">
              <div className="member-avatar large">
                {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
              </div>
              <div className="member-info">
                <h2>{selectedMember.first_name} {selectedMember.last_name}</h2>
                <p>{selectedMember.email} • ID: {selectedMember.student_id}</p>
              </div>
              
              <div className="balance-card">
                <h3>Current Balance</h3>
                <div className={`balance-display ${selectedMember.current_balance > 0 ? 'negative' : 'positive'}`}>
                  {formatCurrency(Math.abs(selectedMember.current_balance || 0))}
                </div>
                <span className={`status-badge large ${getStatusBadge(selectedMember.current_balance).class}`}>
                  {getStatusBadge(selectedMember.current_balance).text}
                </span>
              </div>
            </div>

            {user?.is_officer && (
              <div className="member-actions">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={selectedMember.current_balance <= 0}
                  className="btn-primary"
                >
                  💳 Record Payment
                </button>
                <button
                  onClick={() => setShowFineModal(true)}
                  className="btn-warning"
                >
                  ⚡ Apply Fine
                </button>
              </div>
            )}
          </div>

          <div className="ledger-details">
            <h3>Transaction History</h3>
            
            {memberLedger.length === 0 ? (
              <div className="empty-state small">
                <div className="empty-icon">📝</div>
                <h4>No Transactions</h4>
                <p>No financial transactions recorded for this member yet.</p>
              </div>
            ) : (
              <div className="transaction-list">
                {memberLedger.map(entry => {
                  const typeBadge = getTypeBadge(entry.type);
                  
                  return (
                    <div key={entry.id} className="transaction-item">
                      <div className="transaction-icon">
                        {typeBadge.icon}
                      </div>
                      
                      <div className="transaction-details">
                        <div className="transaction-header">
                          <h4>{entry.description}</h4>
                          <span className="transaction-date">
                            {formatDate(entry.recorded_at || entry.created_at)}
                          </span>
                        </div>
                        
                        <div className="transaction-meta">
                          <span className={`transaction-type ${typeBadge.class}`}>
                            {entry.type.toUpperCase()}
                          </span>
                          {entry.balance_before !== undefined && (
                            <span className="transaction-balance">
                              Balance: {formatCurrency(entry.balance_after)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="transaction-amount">
                        <span className={`amount ${entry.type === 'payment' ? 'positive' : 'negative'}`}>
                          {entry.type === 'payment' ? '-' : '+'}{formatCurrency(entry.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedMember && (
        <PaymentModal
          member={selectedMember}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          onSubmit={handleMakePayment}
          onClose={() => setShowPaymentModal(false)}
          loading={actionLoading === 'payment'}
        />
      )}

      {/* Fine Modal */}
      {showFineModal && selectedMember && (
        <FineModal
          member={selectedMember}
          fineData={fineData}
          setFineData={setFineData}
          onSubmit={handleApplyFine}
          onClose={() => setShowFineModal(false)}
          loading={actionLoading === 'fine'}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ member, paymentData, setPaymentData, onSubmit, onClose, loading }) => (
  <div className="modal-overlay fade-in">
    <div className="modal slide-up">
      <div className="modal-header">
        <h3>Record Payment</h3>
        <button onClick={onClose} className="modal-close">×</button>
      </div>
      
      <form onSubmit={onSubmit} className="modal-body">
        <div className="form-group">
          <label>Member</label>
          <input 
            type="text" 
            value={`${member.first_name} ${member.last_name}`}
            disabled 
          />
        </div>
        
        <div className="form-group">
          <label>Current Balance</label>
          <input 
            type="text" 
            value={new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP'
            }).format(member.current_balance || 0)}
            disabled 
          />
        </div>
        
        <div className="form-group">
          <label>Payment Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={member.current_balance}
            value={paymentData.amount}
            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={paymentData.description}
            onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
            placeholder="Payment description (optional)"
          />
        </div>
        
        <div className="form-group">
          <label>Payment Date</label>
          <input
            type="date"
            value={paymentData.payment_date}
            onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
            required
          />
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Fine Modal Component
const FineModal = ({ member, fineData, setFineData, onSubmit, onClose, loading }) => (
  <div className="modal-overlay fade-in">
    <div className="modal slide-up">
      <div className="modal-header">
        <h3>Apply Fine</h3>
        <button onClick={onClose} className="modal-close">×</button>
      </div>
      
      <form onSubmit={onSubmit} className="modal-body">
        <div className="form-group">
          <label>Member</label>
          <input 
            type="text" 
            value={`${member.first_name} ${member.last_name}`}
            disabled 
          />
        </div>
        
        <div className="form-group">
          <label>Fine Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={fineData.amount}
            onChange={(e) => setFineData({...fineData, amount: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description *</label>
          <input
            type="text"
            value={fineData.description}
            onChange={(e) => setFineData({...fineData, description: e.target.value})}
            placeholder="e.g., Absence fine - Event Name"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Fine Date</label>
          <input
            type="date"
            value={fineData.fine_date}
            onChange={(e) => setFineData({...fineData, fine_date: e.target.value})}
            required
          />
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-warning">
            {loading ? 'Applying...' : 'Apply Fine'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default Financial;