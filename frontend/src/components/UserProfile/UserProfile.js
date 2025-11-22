import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { financialAPI, attendanceAPI, eventsAPI } from '../../services/api';
import realtimeService from '../../services/realtimeService';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import './UserProfile.css';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false); // For events loading
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar' for events
  const [menuOpen, setMenuOpen] = useState(false); // Hamburger menu state
  
  // Scanner states (for officers)
  const [selectedEventForScan, setSelectedEventForScan] = useState('');
  const [activeEvents, setActiveEvents] = useState([]);
  const [scannerMessage, setScannerMessage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  // QR states - now for active event QR codes
  const [activeEventQR, setActiveEventQR] = useState(null);
  const [eventQRStatus, setEventQRStatus] = useState(null); // 'active', 'not_started', 'ended', 'no_event'
  
  // Data states
  const [transactions, setTransactions] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [events, setEvents] = useState([]);
  // Reserved for future dashboard features
  // eslint-disable-next-line no-unused-vars
  const [stats, setStats] = useState({
    attendanceRate: 0,
    currentBalance: 0,
    eventsAttended: 0,
    pendingTasks: 0
  });

  // Load data on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserData();
      // Load active events for scanner if user is officer
      if (user?.is_officer || user?.can_scan) {
        loadActiveEvents();
      }
      
      // Connect to real-time service
      if (!realtimeService.isConnected()) {
        realtimeService.connect();
      }

      // Listen for real-time attendance updates
      const unsubscribeAttendance = realtimeService.on('attendance.recorded', (data) => {
        console.log('Real-time attendance update:', data);
        setScannerMessage(`✓ ${data.message}`);
        loadUserData(); // Refresh data to show new attendance
        setTimeout(() => setScannerMessage(''), 3000);
      });

      // Listen for real-time financial updates
      const unsubscribeFinancial = realtimeService.on('financial.updated', (data) => {
        console.log('Real-time financial update:', data);
        loadUserData(); // Refresh data to show new balance
      });

      return () => {
        if (unsubscribeAttendance && typeof unsubscribeAttendance === 'function') {
          unsubscribeAttendance();
        }
        if (unsubscribeFinancial && typeof unsubscribeFinancial === 'function') {
          unsubscribeFinancial();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.can_scan, user?.is_officer]);

  // Load active event QR code on mount
  const loadActiveEventQR = useCallback(async () => {
    try {
      console.log('Loading active event QR, events count:', events.length);
      
      // Find the first active event from loaded events (based on time window)
      const now = new Date();
      console.log('Current time (browser):', now.toISOString());
      
      const activeEvent = events.find(event => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const isActive = startTime <= now && now <= endTime;
        console.log(`Event "${event.title}": start=${startTime.toISOString()}, end=${endTime.toISOString()}, now=${now.toISOString()}, startTime <= now: ${startTime <= now}, now <= endTime: ${now <= endTime}, is_active=${isActive}`);
        return isActive;
      });

      if (!activeEvent) {
        console.log('No active event found');
        setActiveEventQR(null);
        setEventQRStatus('no_event');
        return;
      }

      console.log('Found active event:', activeEvent.title);

      // Try to fetch QR from the event endpoint
      try {
        const response = await eventsAPI.getEventQR(activeEvent.id);
        console.log('QR response:', response.data);
        setActiveEventQR(response.data);
        setEventQRStatus('active');
      } catch (error) {
        console.log('Error fetching QR:', error.response?.data || error.message);
        if (error.response?.status === 400) {
          // Event exists but is not currently active
          const eventStatus = error.response.data?.event_status;
          setEventQRStatus(eventStatus || 'not_active');
        }
        setActiveEventQR(null);
      }
    } catch (error) {
      console.log('No active event QR:', error.message);
      setEventQRStatus('no_event');
      setActiveEventQR(null);
    }
  }, [events]);

  useEffect(() => {
    if (user?.id) {
      loadActiveEventQR();
      
      // Refresh QR every 10 seconds to check if event is still active
      const qrRefreshInterval = setInterval(loadActiveEventQR, 10000);
      return () => clearInterval(qrRefreshInterval);
    }
  }, [user?.id, loadActiveEventQR, events]);

  const loadActiveEvents = async () => {
    try {
      const res = await eventsAPI.getActiveEvents();
      if (res.data?.events) {
        setActiveEvents(res.data.events);
        if (res.data.events.length > 0) {
          setSelectedEventForScan(res.data.events[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading active events:', error);
    }
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch financial ledger
      const ledgerRes = await financialAPI.getStudentLedger(user.id);
      if (ledgerRes.data?.ledger) {
        setTransactions(ledgerRes.data.ledger);
      }

      // Fetch attendance history
      const attendanceRes = await attendanceAPI.getUserAttendanceHistory(user.id);
      if (attendanceRes.data?.attendance) {
        setAttendanceData(attendanceRes.data.attendance);
      }

      // Fetch events
      const eventsRes = await eventsAPI.getEvents();
      if (eventsRes.data?.data) {
        setEvents(eventsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setScannerMessage('');
      
      // Set the stream to the video element
      setTimeout(() => {
        const video = document.getElementById('camera-video');
        if (video) {
          video.srcObject = stream;
          // Start scanning for QR codes
          scanQRCode(video);
        }
      }, 0);
    } catch (error) {
      setScannerMessage('❌ Unable to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  };

  const scanQRCode = (video) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let isScanning = true;

    const scan = () => {
      if (!isScanning || !cameraOpen) return;

      // Only scan if video is playing and has dimensions
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log('QR Code detected:', code.data);
          isScanning = false;
          handleScanResult(code.data);
          return;
        }
      }

      // Continue scanning
      requestAnimationFrame(scan);
    };

    scan();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const handleScanResult = async (qrData) => {
    if (!selectedEventForScan) {
      setScannerMessage('❌ Please select an event first');
      return;
    }

    try {
      const response = await attendanceAPI.scanQR({
        qr_data: qrData,
        event_id: selectedEventForScan
      });

      if (response.status === 201) {
        const studentName = response.data.student_name || response.data.attendance?.user?.first_name || 'Student';
        setScannerMessage(`✅ Attendance recorded for ${studentName}`);
        
        // Restart camera scanning after a brief delay
        setTimeout(() => {
          if (cameraOpen) {
            const video = document.getElementById('camera-video');
            if (video) {
              scanQRCode(video);
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error recording attendance';
      setScannerMessage(`❌ ${errorMsg}`);
      
      // Restart scanning on error
      setTimeout(() => {
        if (cameraOpen) {
          const video = document.getElementById('camera-video');
          if (video) {
            scanQRCode(video);
          }
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStream]);

  // Calculate balance from transactions
  // eslint-disable-next-line no-unused-vars
  const totalBalance = transactions.reduce((sum, transaction) => {
    const amount = parseFloat(transaction.balance_after) || 0;
    return amount;
  }, 0) || (transactions[transactions.length - 1]?.balance_after || 0);

  // Render actual QR Code
  const renderQRCode = () => {
    if (!activeEventQR) {
      let message = 'No active QR code';
      let submessage = 'QR codes only appear when an event is currently active';
      
      if (eventQRStatus === 'no_event') {
        message = 'No Active Events';
        submessage = 'Wait for an event to start to see the QR code';
      } else if (eventQRStatus === 'not_started' || eventQRStatus === 'not_active') {
        message = 'Event Not Started';
        submessage = 'The QR code will appear when the event begins';
      } else if (eventQRStatus === 'ended') {
        message = 'Event Ended';
        submessage = 'This QR code is no longer valid';
      }

      return (
        <div className="qr-container-display">
          <div className="qr-placeholder">
            <p>{message}</p>
            <p className="qr-note">{submessage}</p>
          </div>
        </div>
      );
    }

    try {
      const qrValue = activeEventQR.qr_code;
      
      return (
        <div className="qr-container-display">
          <div className="qr-box">
            <div className="qr-visual">
              <QRCodeSVG 
                value={qrValue}
                size={220}
                level="H"
                includeMargin={true}
                fgColor="#1b5e3f"
                bgColor="#ffffff"
              />
            </div>
            <div className="qr-info">
              <p className="qr-label">Active Event QR Code</p>
              <p className="qr-event-name">{activeEventQR.event_title}</p>
              <p className="qr-token-display">Valid until: <strong>{new Date(activeEventQR.valid_until).toLocaleTimeString()}</strong></p>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering QR:', error);
      console.log('activeEventQR data:', activeEventQR);
      return (
        <div className="qr-container-display">
          <div className="qr-placeholder">
            <p>Error displaying QR code</p>
            <p className="qr-note">{error.message}</p>
          </div>
        </div>
      );
    }
  };

  const renderDashboard = () => {
    const lastTransaction = transactions[transactions.length - 1];
    const balance = parseFloat(lastTransaction?.balance_after) || 0;
    
    // Calculate upcoming events (events that haven't ended yet)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = events.filter(e => new Date(e.end_time) >= today);
    
    return (
      <div className="dashboard-content">
        <div className="welcome-area">
          <h1>Welcome back, {user?.first_name}!</h1>
          <p>Here's your activity overview</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{Math.round(attendanceData.length > 0 ? (attendanceData.length / Math.max(events.length, 1)) * 100 : 0)}%</div>
            <div className="stat-label">Attendance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">₱{balance.toFixed(2)}</div>
            <div className="stat-label">Current Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{attendanceData.length}</div>
            <div className="stat-label">Events Attended</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{upcomingEvents.length}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
        </div>

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {attendanceData && attendanceData.length > 0 ? (
              attendanceData.slice(-3).reverse().map((attendance, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">✅</div>
                  <div className="activity-details">
                    <span className="activity-title">Event Attendance</span>
                    <span className="activity-time">
                      {new Date(attendance.created_at).toLocaleDateString()} {new Date(attendance.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-item">
                <div className="activity-icon">ℹ️</div>
                <div className="activity-details">
                  <span className="activity-title">No recent activity</span>
                  <span className="activity-time">Attend events to see activity here</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="profile-content">
      <div className="profile-header">
        <div className="user-avatar">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div className="user-info">
          <h2>{user?.first_name} {user?.last_name}</h2>
          <p>{user?.email}</p>
          <span className="student-id">ID: {user?.student_id}</span>
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
        </div>

        <div className="detail-group">
          <h3>Attendance QR Code</h3>
          <div className="qr-section">
            {renderQRCode()}
            <div className="qr-button-container">
              <button 
                className="refresh-btn"
                onClick={loadActiveEventQR}
                title="Refresh to check for active event QR codes"
              >
                🔁 Refresh QR Status
              </button>
            </div>
            <p className="qr-help">✅ QR codes appear automatically when an event is active. No manual generation needed. QR codes disappear when the event ends, preventing misuse.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLedger = () => {
    const lastTransaction = transactions[transactions.length - 1];
    const balance = parseFloat(lastTransaction?.balance_after) || 0;
    
    return (
      <div className="ledger-content">
        <div className="balance-summary">
          <h3>Current Balance</h3>
          <div className={`balance-amount ${balance > 0 ? 'positive' : 'negative'}`}>
            ₱{balance.toFixed(2)}
          </div>
          <div className="balance-label">Last updated: {new Date().toLocaleDateString()}</div>
        </div>

        <div className="transactions-section">
          <h3>Transaction History</h3>
          <div className="transactions-list">
            {transactions && transactions.length > 0 ? (
              [...transactions].reverse().map((transaction, idx) => (
                <div key={idx} className="transaction-item">
                  <div className="transaction-info">
                    <span className="transaction-title">{transaction.description}</span>
                    <span className="transaction-type">{transaction.type}</span>
                    <span className="transaction-date">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`transaction-amount ${transaction.type === 'payment' ? 'negative' : 'positive'}`}>
                    {transaction.type === 'payment' ? '-' : '+'}₱{Math.abs(parseFloat(transaction.amount) || 0).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-transactions">
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEventsCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate calendar days for current month
    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const days = daysInMonth(today);
    const calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    for (let i = 1; i <= days; i++) {
      calendarDays.push(new Date(today.getFullYear(), today.getMonth(), i));
    }

    // Map events by date with attendance status
    const eventsByDate = {};
    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      eventDate.setHours(0, 0, 0, 0);
      const dateStr = eventDate.toISOString().split('T')[0];
      
      // Check if user attended this event
      const attendance = attendanceData.find(a => {
        const attendanceDate = new Date(a.created_at);
        attendanceDate.setHours(0, 0, 0, 0);
        return attendanceDate.toISOString().split('T')[0] === dateStr;
      });
      
      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
      eventsByDate[dateStr].push({
        ...event,
        userAttendanceStatus: attendance ? '✅ Present' : (new Date(event.end_time) < today ? '❌ Absent' : '⏳ Pending')
      });
    });

    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <h3>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        </div>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {calendarDays.map((date, idx) => {
            const dateStr = date ? date.toISOString().split('T')[0] : null;
            const dayEvents = dateStr ? eventsByDate[dateStr] || [] : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            // Determine status class
            let statusClass = '';
            if (dayEvents.length > 0) {
              const hasPresent = dayEvents.some(e => e.userAttendanceStatus === '✅ Present');
              const hasAbsent = dayEvents.some(e => e.userAttendanceStatus === '❌ Absent');
              statusClass = hasPresent ? 'present' : hasAbsent ? 'absent' : 'pending';
            }

            return (
              <div key={idx} className={`calendar-cell ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${statusClass}`}>
                {date && (
                  <>
                    <span className="day-number">{date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <>
                        <span className="event-indicator">{dayEvents.length}</span>
                        <span className="attendance-status">
                          {dayEvents[0].userAttendanceStatus === '✅ Present' ? '✅' : dayEvents[0].userAttendanceStatus === '❌ Absent' ? '❌' : '⏳'}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          <div className="legend-item"><span className="legend-mark present">✅</span> Present</div>
          <div className="legend-item"><span className="legend-mark absent">❌</span> Absent</div>
          <div className="legend-item"><span className="legend-mark pending">⏳</span> Pending</div>
        </div>
      </div>
    );
  };

  const renderEventsList = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = events.filter(e => new Date(e.start_time) >= today).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const pastEvents = events.filter(e => new Date(e.end_time) < today).sort((a, b) => new Date(b.end_time) - new Date(a.end_time));

    // Helper function to get attendance status for an event
    const getEventAttendanceStatus = (event) => {
      const eventDate = new Date(event.start_time);
      eventDate.setHours(0, 0, 0, 0);
      const dateStr = eventDate.toISOString().split('T')[0];
      
      const attendance = attendanceData.find(a => {
        const attendanceDate = new Date(a.created_at);
        attendanceDate.setHours(0, 0, 0, 0);
        return attendanceDate.toISOString().split('T')[0] === dateStr;
      });
      
      if (attendance) return 'present';
      if (new Date(event.end_time) < today) return 'absent';
      return 'pending';
    };

    return (
      <div className="events-list-view">
        <div className="events-section">
          <h3>📅 Upcoming Events ({upcomingEvents.length})</h3>
          <div className="events-list-container">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map(event => {
                const attendanceStatus = getEventAttendanceStatus(event);
                const statusDisplay = attendanceStatus === 'present' ? '✅ Present' : '⏳ Pending';
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                return (
                  <div key={event.id} className={`event-card upcoming ${attendanceStatus}`}>
                    <div className="event-date-badge">
                      <span className="date-day">{startTime.getDate()}</span>
                      <span className="date-month">{startTime.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                    <div className="event-card-content">
                      <h4>{event.title}</h4>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                      <div className="event-details">
                        <p className="event-time">
                          🕐 Start: {startTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="event-time">
                          🏁 End: {endTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="event-status">{event.is_active ? '🟢 Active' : '⚫ Inactive'}</p>
                      </div>
                    </div>
                    <div className={`attendance-badge ${attendanceStatus}`}>
                      {statusDisplay}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-events-message">No upcoming events</p>
            )}
          </div>
        </div>

        <div className="events-section">
          <h3>📜 Past Events ({pastEvents.length})</h3>
          <div className="events-list-container">
            {pastEvents.length > 0 ? (
              pastEvents.map(event => {
                const attendanceStatus = getEventAttendanceStatus(event);
                const statusDisplay = attendanceStatus === 'present' ? '✅ Present' : '❌ Absent';
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                return (
                  <div key={event.id} className={`event-card past ${attendanceStatus}`}>
                    <div className="event-date-badge">
                      <span className="date-day">{endTime.getDate()}</span>
                      <span className="date-month">{endTime.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                    <div className="event-card-content">
                      <h4>{event.title}</h4>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                      <div className="event-details">
                        <p className="event-time">
                          🕐 Start: {startTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="event-time">
                          🏁 End: {endTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={`attendance-badge ${attendanceStatus}`}>
                      {statusDisplay}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-events-message">No past events</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = () => (
    <div className="events-content">
      <div className="events-header">
        <h3>📅 Events</h3>
        <button 
          className="btn-refresh"
          onClick={() => loadUserData()}
          disabled={loading}
          title="Refresh events"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 List View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendar View
        </button>
      </div>

      {loading ? (
        <div className="loading-events">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="no-events-placeholder">
          <p>📭 No events available</p>
        </div>
      ) : (
        viewMode === 'calendar' ? renderEventsCalendar() : renderEventsList()
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="attendance-content">
      <h3>📊 Attendance Record</h3>
      <div className="attendance-stats">
        <div className="attendance-stat">
          <span className="stat-number">{attendanceData.length}</span>
          <span className="stat-text">Events Attended</span>
        </div>
        <div className="attendance-stat">
          <span className="stat-number">{Math.round(attendanceData.length > 0 ? (attendanceData.length / Math.max(events.length, 1)) * 100 : 0)}%</span>
          <span className="stat-text">Attendance Rate</span>
        </div>
      </div>

      <div className="attendance-list">
        <h4>Recent Attendance</h4>
        {attendanceData && attendanceData.length > 0 ? (
          [...attendanceData].reverse().slice(0, 10).map((attendance, idx) => (
            <div key={idx} className="attendance-item">
              <span className="attendance-icon">✓</span>
              <span className="attendance-date">
                {new Date(attendance.created_at).toLocaleDateString()} at {new Date(attendance.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="attendance-badge present">Present</span>
            </div>
          ))
        ) : (
          <p className="no-attendance">No attendance records yet</p>
        )}
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="scanner-content">
      <h3>QR Code Scanner</h3>
      <p className="scanner-subtitle">Scan student QR codes to mark attendance</p>
      
      <div className="scanner-form">
        <div className="form-group">
          <label>Select Event</label>
          <select 
            value={selectedEventForScan} 
            onChange={(e) => setSelectedEventForScan(e.target.value)}
          >
            <option value="">Choose an active event</option>
            {activeEvents.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.start_time).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Section */}
        <div className="camera-section">
          {!cameraOpen ? (
            <button 
              type="button"
              onClick={startCamera}
              className="btn-camera"
              disabled={!selectedEventForScan}
              title="Open camera to scan QR codes"
            >
              📷 Open Camera
            </button>
          ) : (
            <div className="camera-container">
              <div className="camera-header">
                <p>📹 Point camera at QR code - Auto-scanning</p>
              </div>
              <video 
                id="camera-video"
                autoPlay 
                playsInline 
                className="camera-video"
              ></video>
              <div className="camera-overlay">
                <div className="qr-frame">
                  <div className="corner corner-tl"></div>
                  <div className="corner corner-tr"></div>
                  <div className="corner corner-bl"></div>
                  <div className="corner corner-br"></div>
                </div>
              </div>
              <div className="camera-controls">
                <button 
                  type="button"
                  onClick={stopCamera}
                  className="btn-close-camera"
                >
                  ✕ Close Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {scannerMessage && (
          <div className={`scanner-message ${scannerMessage.includes('✓') ? 'success' : 'error'}`}>
            {scannerMessage}
          </div>
        )}
      </div>

      {activeEvents.length === 0 && (
        <div className="no-events-message">
          <p>No active events available. Check back when an event is running.</p>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'events':
        return renderEvents();
      case 'attendance':
        return renderAttendance();
      case 'ledger':
        return renderLedger();
      case 'profile':
        return renderProfile();
      case 'scanner':
        return renderScanner();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="student-portal">
      <header className="portal-header">
        <div className="header-main">
          <h1>Student Portal</h1>
          <button 
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setMenuOpen(false);
              }}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('events');
                setMenuOpen(false);
              }}
            >
              Events
            </button>
            <button 
              className={`nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('attendance');
                setMenuOpen(false);
              }}
            >
              Attendance
            </button>
            <button 
              className={`nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('ledger');
                setMenuOpen(false);
              }}
            >
              Ledger
            </button>
            {(user?.is_officer || user?.can_scan) && (
              <button 
                className={`nav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('scanner');
                  setMenuOpen(false);
                }}
              >
                Scanner
              </button>
            )}
            <button 
              className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setMenuOpen(false);
              }}
            >
              Profile
            </button>
          </nav>
        </div>
        <div className="header-actions">
          {(user?.is_officer || user?.role === 'officer' || user?.role === 'admin') && (
            <button 
              className="dashboard-link-btn"
              onClick={() => navigate('/dashboard')}
              title="Go to Officer Dashboard"
            >
              📊 Dashboard
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="portal-main">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default UserProfile;