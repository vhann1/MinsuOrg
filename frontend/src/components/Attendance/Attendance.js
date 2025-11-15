import React, { useState, useEffect } from 'react';
import './Attendance.css';

const Attendance = () => {
  const [activeEvents, setActiveEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scanResult, setScanResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchActiveEvents();
  }, []);

  const fetchActiveEvents = async () => {
    try {
      const response = await fetch('/api/events/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (response.ok) {
        const events = await response.json();
        setActiveEvents(events);
        if (events.length > 0) {
          setSelectedEvent(events[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchEventAttendance = async (eventId) => {
    if (!eventId) return;
    
    try {
      const response = await fetch(`/api/events/${eventId}/attendance-details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setScanResult('');
    setMessage('');
    
    // Initialize QR scanner
    if (window.QRScanner) {
      window.QRScanner.prepare((err, status) => {
        if (err) {
          console.error('QR Scanner error:', err);
          setMessage('Error starting QR scanner');
          setScanning(false);
          return;
        }
        
        if (status.authorized) {
          window.QRScanner.scan((err, result) => {
            if (err) {
              console.error('Scan error:', err);
              return;
            }
            if (result) {
              handleScanResult(result);
            }
          });
          
          window.QRScanner.show();
          setScanner(window.QRScanner);
        } else {
          setMessage('Camera access denied');
          setScanning(false);
        }
      });
    } else {
      // Fallback for web - use file input for QR image upload
      setMessage('Using file upload for QR scanning');
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (scanner) {
      scanner.destroy();
      setScanner(null);
    }
  };

  const handleScanResult = async (qrData) => {
    setScanResult(qrData);
    setLoading(true);
    
    try {
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
          qr_data: qrData,
          event_id: selectedEvent
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`Attendance recorded for ${result.user_name}`);
        fetchEventAttendance(selectedEvent);
      } else {
        setMessage(result.message || 'Error recording attendance');
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      setMessage('Error recording attendance');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setScanResult('');
        setMessage('');
      }, 3000);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Simple file reading - in production, use a proper QR decoding library
    const reader = new FileReader();
    reader.onload = (e) => {
      // This is a simplified version - you'd need a QR decoding library here
      setMessage('QR file uploaded - processing...');
      // Simulate QR data extraction
      setTimeout(() => {
        handleScanResult('simulated_qr_data_from_image');
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  const handleManualAttendance = async (userId, status) => {
    try {
      const response = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
          user_id: userId,
          event_id: selectedEvent,
          status: status
        })
      });

      if (response.ok) {
        setMessage('Manual attendance recorded');
        fetchEventAttendance(selectedEvent);
      } else {
        setMessage('Error recording manual attendance');
      }
    } catch (error) {
      console.error('Error with manual attendance:', error);
      setMessage('Error recording attendance');
    }
  };

  return (
    <div className="attendance">
      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="event-selector">
          <label>Select Event:</label>
          <select 
            value={selectedEvent} 
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              fetchEventAttendance(e.target.value);
            }}
          >
            <option value="">Select an event</option>
            {activeEvents.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="scanner-section">
        <h3>QR Code Scanner</h3>
        {!scanning ? (
          <div className="scanner-controls">
            <button 
              className="btn-scan"
              onClick={startScanner}
              disabled={!selectedEvent}
            >
              Start QR Scanner
            </button>
            <div className="file-upload">
              <label className="btn-upload">
                Upload QR Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="scanner-active">
            <div className="scanner-view">
              <div className="scanner-frame">
                <div className="scan-line"></div>
                <p>Point camera at QR code</p>
              </div>
            </div>
            <button 
              className="btn-stop"
              onClick={stopScanner}
            >
              Stop Scanner
            </button>
          </div>
        )}
        
        {scanResult && (
          <div className="scan-result">
            <p>Scanned: {scanResult}</p>
            {loading && <p>Processing...</p>}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="attendance-list">
          <h3>Attendance Records</h3>
          <div className="attendance-stats">
            <div className="stat">
              <span className="stat-label">Present:</span>
              <span className="stat-value">
                {attendanceData.filter(a => a.status === 'present').length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Absent:</span>
              <span className="stat-value">
                {attendanceData.filter(a => a.status === 'absent').length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{attendanceData.length}</span>
            </div>
          </div>
          
          <div className="attendance-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map(record => (
                  <tr key={record.id}>
                    <td>{record.user_name}</td>
                    <td>{record.student_id}</td>
                    <td>
                      <span className={`status-badge status-${record.status}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      {record.recorded_at ? 
                        new Date(record.recorded_at).toLocaleTimeString() : 
                        'Not recorded'
                      }
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-present"
                          onClick={() => handleManualAttendance(record.user_id, 'present')}
                        >
                          Mark Present
                        </button>
                        <button 
                          className="btn-absent"
                          onClick={() => handleManualAttendance(record.user_id, 'absent')}
                        >
                          Mark Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;