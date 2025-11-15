// src/components/Calendar/Calendar.js
import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../../services/api';
import './Calendar.css';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month' or 'list'

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getEvents();
      setEvents(response.data.events || response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDay = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const today = new Date();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1>Event Calendar</h1>
        <div className="calendar-controls">
          <button 
            className="btn btn-secondary"
            onClick={() => setView(view === 'month' ? 'list' : 'month')}
          >
            {view === 'month' ? 'List View' : 'Month View'}
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="calendar-month-view">
          <div className="calendar-header">
            <button onClick={() => navigateMonth(-1)} className="nav-btn">←</button>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button onClick={() => navigateMonth(1)} className="nav-btn">→</button>
          </div>

          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className="calendar-day empty"></div>
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = today.getDate() === day && 
                             today.getMonth() === currentDate.getMonth() && 
                             today.getFullYear() === currentDate.getFullYear();

              return (
                <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                  <div className="day-number">{day}</div>
                  <div className="day-events">
                    {dayEvents.slice(0, 2).map(event => (
                      <div 
                        key={event.id} 
                        className={`event-dot ${event.is_active ? 'active' : 'inactive'}`}
                        title={event.title}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="more-events">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="calendar-list-view">
          <h2>Upcoming Events</h2>
          <div className="events-list">
            {events
              .filter(event => new Date(event.end_time) >= today)
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .map(event => (
                <div key={event.id} className="event-list-item">
                  <div className="event-date">
                    <div className="event-day">
                      {new Date(event.start_time).getDate()}
                    </div>
                    <div className="event-month">
                      {monthNames[new Date(event.start_time).getMonth()].substring(0, 3)}
                    </div>
                  </div>
                  <div className="event-details">
                    <h4>{event.title}</h4>
                    <p>{event.description}</p>
                    <div className="event-time">
                      {new Date(event.start_time).toLocaleTimeString()} - {new Date(event.end_time).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="event-status">
                    <span className={`status-badge ${event.is_active ? 'active' : 'inactive'}`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            {events.filter(event => new Date(event.end_time) >= today).length === 0 && (
              <p className="no-events">No upcoming events</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;