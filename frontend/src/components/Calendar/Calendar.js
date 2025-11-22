// src/components/Calendar/Calendar.js
import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../../services/api';
import './Calendar.css';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'list'
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getEvents();
      setEvents(response.data.events || response.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + direction);
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction * 7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + direction);
        break;
      default:
        break;
    }
    
    setCurrentDate(newDate);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  // Date calculation functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekDates = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      weekDates.push(weekDay);
    }
    return weekDates;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time || event.date);
      return eventDate.getDate() === date.getDate() && 
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const getEventsForDay = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getEventsForDate(date);
  };

  // Formatting functions
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // formatDateShort - reserved for future use
  // eslint-disable-next-line no-unused-vars
  const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Date arrays
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate years for dropdown (current year ± 10 years)
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  const weekDates = getWeekDates(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  return (
    <div className="calendar">
      {/* Enhanced Header */}
      <div className="calendar-header">
        <div className="header-content">
          <h1>Event Calendar</h1>
          <p>View and manage organization events</p>
        </div>
        
        <div className="calendar-controls">
          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              className={`view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
            <button 
              className={`view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button 
              className={`view-btn ${view === 'day' ? 'active' : ''}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button 
              className={`view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          
          {/* Date Navigation */}
          <div className="calendar-nav">
            <div className="nav-controls">
              <button className="nav-btn" onClick={() => navigateDate(-1)}>
                ‹
              </button>
              
              <div className="date-display">
                {view === 'month' && (
                  <div className="month-year-selector">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => {
                        const newMonth = parseInt(e.target.value);
                        setSelectedMonth(newMonth);
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newMonth);
                        setCurrentDate(newDate);
                      }}
                      className="month-select"
                    >
                      {monthNames.map((month, index) => (
                        <option key={month} value={index}>{month}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        setSelectedYear(newYear);
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(newYear);
                        setCurrentDate(newDate);
                      }}
                      className="year-select"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {view === 'week' && (
                  <span className="current-period">
                    {`${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                      ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </span>
                )}
                
                {view === 'day' && (
                  <span className="current-period">
                    {currentDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
                
                {view === 'list' && (
                  <span className="current-period">All Events</span>
                )}
              </div>
              
              <button className="nav-btn" onClick={() => navigateDate(1)}>
                ›
              </button>
              
              <button className="today-btn" onClick={goToToday}>
                Today
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="calendar-stats">
        <div className="stat-card events">
          <div className="stat-number">{events.length}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card attendance">
          <div className="stat-number">
            {events.filter(event => !event.is_active).length}
          </div>
          <div className="stat-label">Inactive Events</div>
        </div>
        <div className="stat-card financial">
          <div className="stat-number">
            {events.filter(event => event.is_active).length}
          </div>
          <div className="stat-label">Active Events</div>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="calendar-view month-view">
          <div className="weekdays-header">
            {dayNamesShort.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          
          <div className="days-grid">
            {/* Empty days for first week */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className="calendar-day other-month"></div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayEvents = getEventsForDay(day);
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <div 
                  key={day} 
                  className={`calendar-day ${isToday ? 'today' : ''}`}
                  onClick={() => dayEvents.length > 0 && setSelectedEvent({ dayEvents, date })}
                >
                  <div className="day-number">{day}</div>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id} 
                        className={`event-indicator ${event.type || 'event'}`}
                        title={`${event.title} - ${formatTime(event.start_time)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="event-indicator event">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="calendar-view week-view">
          <div className="week-header">
            <div className="time-column"></div>
            {weekDates.map((date, index) => {
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={index} className={`week-day-header ${isToday ? 'today' : ''}`}>
                  <div className="week-day-name">{dayNamesShort[date.getDay()]}</div>
                  <div className="week-day-date">{date.getDate()}</div>
                </div>
              );
            })}
          </div>
          
          <div className="week-grid">
            {/* Time slots */}
            {Array.from({ length: 12 }).map((_, hourIndex) => {
              const hour = hourIndex + 8; // 8 AM to 7 PM
              return (
                <div key={hour} className="time-slot-row">
                  <div className="time-label">{hour}:00</div>
                  {weekDates.map((date, dayIndex) => {
                    const dayEvents = getEventsForDate(date).filter(event => {
                      const eventHour = new Date(event.start_time).getHours();
                      return eventHour === hour;
                    });
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className="time-slot"
                        onClick={() => dayEvents.length > 0 && setSelectedEvent({ dayEvents, date })}
                      >
                        {dayEvents.map(event => (
                          <div 
                            key={event.id} 
                            className={`week-event ${event.type || 'event'}`}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="calendar-view day-view">
          <div className="day-header">
            <div className="time-column"></div>
            <div className="day-details">
              <div className="day-name">{dayNames[currentDate.getDay()]}</div>
              <div className="full-date">
                {currentDate.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          <div className="day-grid">
            {Array.from({ length: 14 }).map((_, hourIndex) => {
              const hour = hourIndex + 7; // 7 AM to 8 PM
              const hourEvents = getEventsForDate(currentDate).filter(event => {
                const eventHour = new Date(event.start_time).getHours();
                return eventHour === hour;
              });
              
              return (
                <div key={hour} className="day-time-slot">
                  <div className="day-time-label">{hour}:00</div>
                  <div 
                    className="day-events-container"
                    onClick={() => hourEvents.length > 0 && setSelectedEvent(hourEvents[0])}
                  >
                    {hourEvents.map(event => (
                      <div 
                        key={event.id} 
                        className={`day-event ${event.type || 'event'}`}
                      >
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </div>
                        {event.location && (
                          <div className="event-location">📍 {event.location}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="calendar-view">
          <div className="upcoming-events">
            <h3>All Events</h3>
            <div className="event-list">
              {events
                .sort((a, b) => new Date(a.start_time || a.date) - new Date(b.start_time || b.date))
                .map(event => (
                  <div 
                    key={event.id} 
                    className="event-item"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="event-info">
                      <div className="event-name">{event.title}</div>
                      <div className="event-date">
                        {formatDate(event.start_time)} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        {event.location && ` • 📍 ${event.location}`}
                      </div>
                    </div>
                    <div className="event-actions">
                      <span className={`status-badge ${event.is_active ? 'active' : 'inactive'}`}>
                        {event.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              
              {events.length === 0 && (
                <div className="no-events">
                  <p>No events found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedEvent.title || `Events on ${selectedEvent.date?.toLocaleDateString()}`}
              </h3>
              <button 
                className="btn-close"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {selectedEvent.dayEvents ? (
                // Multiple events for a day
                <div className="event-details">
                  <h4>Events on {selectedEvent.date.toLocaleDateString()}</h4>
                  {selectedEvent.dayEvents.map(event => (
                    <div key={event.id} className="event-item">
                      <div className="event-info">
                        <div className="event-name">{event.title}</div>
                        <div className="event-date">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status:</span>
                          <span className={`status ${event.is_active ? 'active' : 'inactive'}`}>
                            {event.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {event.description && (
                          <div className="detail-item">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{event.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single event details
                <div className="event-details">
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{formatDate(selectedEvent.start_time)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">
                      {formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}
                    </span>
                  </div>
                  {selectedEvent.location && (
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{selectedEvent.location}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status ${selectedEvent.is_active ? 'active' : 'inactive'}`}>
                      {selectedEvent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {selectedEvent.description && (
                    <div className="detail-item">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value">{selectedEvent.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;