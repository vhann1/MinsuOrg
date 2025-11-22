// src/components/Events/Events.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { eventsAPI } from '../../services/api';
import './Events.css';

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: ''
  });
  const [editEvent, setEditEvent] = useState({
    id: null,
    title: '',
    description: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (user?.is_officer) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getEvents();
      setEvents(response.data.data || response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('creating');
      await eventsAPI.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time
      });
      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        start_time: '',
        end_time: ''
      });
      await fetchEvents();
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error adding event:', error);
      alert(error.response?.data?.message || 'Failed to create event. Please try again.');
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
          <p>Officer privileges are required to manage events.</p>
        </div>
      </div>
    );
  }

  const handleToggleActive = async (eventId, currentStatus) => {
    try {
      setActionLoading(eventId);
      await eventsAPI.toggleActive(eventId);
      await fetchEvents();
    } catch (error) {
      console.error('Error toggling event:', error);
      alert('Failed to update event status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAbsent = async (eventId) => {
    if (!window.confirm('Are you sure you want to mark absent students for this event? This will apply fines to absent members.')) {
      return;
    }

    try {
      setActionLoading(`absent-${eventId}`);
      const response = await eventsAPI.markAbsentStudents(eventId);
      await fetchEvents();
      alert(`Successfully marked ${response.data.absent_count} students as absent.`);
    } catch (error) {
      console.error('Error marking absent:', error);
      alert('Failed to mark absent students. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditEvent = (event) => {
    // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
    const startTime = new Date(event.start_time).toISOString().slice(0, 16);
    const endTime = new Date(event.end_time).toISOString().slice(0, 16);
    
    setEditEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      start_time: startTime,
      end_time: endTime
    });
    setShowEditModal(true);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('updating');
      await eventsAPI.updateEvent(editEvent.id, {
        title: editEvent.title,
        description: editEvent.description,
        start_time: editEvent.start_time,
        end_time: editEvent.end_time
      });
      setShowEditModal(false);
      setEditEvent({
        id: null,
        title: '',
        description: '',
        start_time: '',
        end_time: ''
      });
      await fetchEvents();
      alert('Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      alert(error.response?.data?.message || 'Failed to update event. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(`delete-${eventId}`);
      await eventsAPI.deleteEvent(eventId);
      await fetchEvents();
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(error.response?.data?.message || 'Failed to delete event. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessAllExpired = async () => {
    if (!window.confirm('This will mark absent students for ALL expired events that haven\'t been processed. Continue?')) {
      return;
    }

    try {
      setActionLoading('processing-all');
      const response = await eventsAPI.processAllExpiredEvents();
      await fetchEvents();
      alert(`Processed ${response.data.total_events_processed} events, marked ${response.data.total_absences_marked} absences.`);
    } catch (error) {
      console.error('Error processing expired events:', error);
      alert('Failed to process expired events. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getEventsNeedingProcessing = () => {
    return events.filter(event => {
      const eventEnd = new Date(event.end_time);
      const now = new Date();
      return eventEnd < now && event.absent_count === 0;
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    if (!event.is_active) return 'cancelled';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'active';
    if (now > end) return 'ended';
    return 'unknown';
  };

  const getStatusColor = (status) => {
    const colors = {
      upcoming: '#1b5e3f',
      active: '#27ae60',
      ended: '#666666',
      cancelled: '#d32f2f'
    };
    return colors[status] || '#666666';
  };

  const getStatusBgColor = (status) => {
    const colors = {
      upcoming: '#e8f5f0',
      active: '#e8f8f0',
      ended: '#f5f5f5',
      cancelled: '#fce4e4'
    };
    return colors[status] || '#f5f5f5';
  };

  if (loading) {
    return (
      <div className="events-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  const eventsNeedingProcessing = getEventsNeedingProcessing();

  return (
    <div className="events-page fade-in">
      {/* Header Section */}
      <div className="page-header slide-up">
        <div className="header-content">
          <h1>Event Management</h1>
          <p>Create and manage organization events with automatic attendance tracking</p>
        </div>
        
        <div className="header-actions">
          {user?.is_officer && eventsNeedingProcessing.length > 0 && (
            <button 
              className="btn-warning"
              onClick={handleProcessAllExpired}
              disabled={actionLoading === 'processing-all'}
            >
              {actionLoading === 'processing-all' ? 'Processing...' : `Process ${eventsNeedingProcessing.length} Expired Events`}
            </button>
          )}
          
          {user?.is_officer && (
            <button 
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Create Event
            </button>
          )}
        </div>
      </div>

      {/* Events Needing Processing Alert */}
      {user?.is_officer && eventsNeedingProcessing.length > 0 && (
        <div className="processing-alert slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <h4>Events Need Processing</h4>
            <p>{eventsNeedingProcessing.length} expired event(s) need absent marking</p>
          </div>
          <button 
            className="btn-alert"
            onClick={handleProcessAllExpired}
            disabled={actionLoading === 'processing-all'}
          >
            {actionLoading === 'processing-all' ? 'Processing...' : 'Process All'}
          </button>
        </div>
      )}

      {/* Events Grid/List */}
      <div className="events-container slide-up" style={{ animationDelay: '0.3s' }}>
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No Events Yet</h3>
            <p>Create your first event to get started with attendance tracking.</p>
            {user?.is_officer && (
              <button 
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                Create Your First Event
              </button>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => {
              const status = getEventStatus(event);
              const needsProcessing = status === 'ended' && event.absent_count === 0;
              
              return (
                <div key={event.id} className="event-card" style={{ borderLeftColor: getStatusColor(status) }}>
                  {/* Event Status Badge */}
                  <div className="event-status-badge" style={{ backgroundColor: getStatusBgColor(status) }}>
                    <span 
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(status) }}
                    ></span>
                    <span className="status-text" style={{ color: getStatusColor(status) }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  {/* Event Header */}
                  <div className="event-header">
                    <div className="event-title-section">
                      <h3>{event.title}</h3>
                    </div>
                    
                    {user?.is_officer && (
                      <button 
                        className={`btn-toggle ${event.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(event.id, event.is_active)}
                        disabled={actionLoading === event.id}
                        title={event.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {actionLoading === event.id ? '...' : (event.is_active ? '🟢 Active' : '⚪ Inactive')}
                      </button>
                    )}
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  {/* Event Timeline */}
                  <div className="event-timeline">
                    <div className="timeline-item">
                      <span className="timeline-label">Starts:</span>
                      <span className="timeline-value">{formatDate(event.start_time)}</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">Ends:</span>
                      <span className="timeline-value">{formatDate(event.end_time)}</span>
                    </div>
                  </div>

                  {/* Attendance Stats */}
                  <div className="attendance-stats">
                    <div className="stat">
                      <span className="stat-label">Present</span>
                      <span className="stat-value present">{event.present_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Absent</span>
                      <span className="stat-value absent">{event.absent_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Rate</span>
                      <span className="stat-value rate">
                        {event.attendance_rate ? `${event.attendance_rate}%` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="event-footer">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowAbsentModal(true);
                      }}
                      title="View attendance details"
                    >
                      👥 View Attendance
                    </button>
                    
                    {user?.is_officer && (
                      <>
                        <button 
                          className="btn-secondary"
                          onClick={() => handleEditEvent(event)}
                          title="Edit event details"
                        >
                          ✏️ Edit
                        </button>
                        
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={actionLoading === `delete-${event.id}`}
                          title="Delete this event"
                        >
                          {actionLoading === `delete-${event.id}` ? '...' : '🗑️ Delete'}
                        </button>
                      </>
                    )}
                    
                    {user?.is_officer && needsProcessing && (
                      <button 
                        className="btn-warning"
                        onClick={() => handleMarkAbsent(event.id)}
                        disabled={actionLoading === `absent-${event.id}`}
                        title="Mark all non-present students as absent and apply fines"
                      >
                        {actionLoading === `absent-${event.id}` ? 'Marking...' : '🚨 Mark Absent'}
                      </button>
                    )}
                    
                    {user?.is_officer && status === 'ended' && event.absent_count > 0 && (
                      <span className="processed-badge">
                        ✅ Processed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="modal-overlay fade-in">
          <div className="modal slide-up">
            <div className="modal-header">
              <h3>Create New Event</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddEvent} className="modal-body">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Describe the event (optional)"
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading === 'creating'}
                  className="btn-primary"
                >
                  {actionLoading === 'creating' ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Details Modal */}
      {showAbsentModal && selectedEvent && (
        <div className="modal-overlay fade-in">
          <div className="modal slide-up large">
            <div className="modal-header">
              <h3>Attendance - {selectedEvent.title}</h3>
              <button 
                onClick={() => setShowAbsentModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="attendance-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Present</span>
                  <span className="summary-value present">{selectedEvent.present_count || 0}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Absent</span>
                  <span className="summary-value absent">{selectedEvent.absent_count || 0}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Attendance Rate</span>
                  <span className="summary-value rate">
                    {selectedEvent.attendance_rate ? `${selectedEvent.attendance_rate}%` : 'N/A'}
                  </span>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowAbsentModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                {user?.is_officer && getEventStatus(selectedEvent) === 'ended' && selectedEvent.absent_count === 0 && (
                  <button 
                    className="btn-warning"
                    onClick={() => {
                      handleMarkAbsent(selectedEvent.id);
                      setShowAbsentModal(false);
                    }}
                  >
                    Mark Absent Students
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="modal-overlay fade-in">
          <div className="modal slide-up">
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateEvent} className="modal-body">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({...editEvent, title: e.target.value})}
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editEvent.description}
                  onChange={(e) => setEditEvent({...editEvent, description: e.target.value})}
                  placeholder="Describe the event (optional)"
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={editEvent.start_time}
                    onChange={(e) => setEditEvent({...editEvent, start_time: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    value={editEvent.end_time}
                    onChange={(e) => setEditEvent({...editEvent, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading === 'updating'}
                  className="btn-primary"
                >
                  {actionLoading === 'updating' ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;