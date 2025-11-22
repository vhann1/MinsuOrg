import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { eventsAPI, attendanceAPI } from '../../services/api';
import jsQR from 'jsqr';
import './Attendance.css';

const Attendance = () => {
  const { user } = useAuth();
  const [activeEvents, setActiveEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    fetchActiveEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchActiveEvents = async () => {
    try {
      setPageLoading(true);
      const response = await eventsAPI.getActiveEvents();
      const events = response.data.events || [];
      setActiveEvents(events);
      if (events.length > 0) {
        setSelectedEvent(events[0].id);
        await fetchEventAttendance(events[0].id);
      }
    } catch (error) {
      console.error('Error fetching active events:', error);
      showMessage('Failed to load active events. Check your connection.', 'error');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchEventAttendance = async (eventId) => {
    if (!eventId) return;
    
    try {
      const response = await eventsAPI.getEventAttendance(eventId);
      setAttendanceData(response.data.attendances || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      showMessage('Failed to load attendance records.', 'error');
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 4000);
  };

  const startCamera = async () => {
    try {
      if (!selectedEvent) {
        showMessage('Please select an event first', 'error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setMessage('');
      
      // Set the stream to the video element
      setTimeout(() => {
        const video = document.getElementById('attendance-camera-video');
        if (video) {
          video.srcObject = stream;
          // Start scanning for QR codes
          scanQRCode(video);
        }
      }, 100);
    } catch (error) {
      showMessage('❌ Unable to access camera. Please check permissions.', 'error');
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
          isScanning = false; // Stop scanning while processing
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

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleScanResult = async (qrData) => {
    setLoading(true);
    
    try {
      const response = await attendanceAPI.scanQR({
        qr_data: qrData,
        event_id: selectedEvent
      });

      if (response.status === 201) {
        const studentName = response.data.student_name || response.data.attendance?.user?.first_name || 'Student';
        showMessage(`✅ Attendance recorded for ${studentName}`, 'success');
        
        // Refresh attendance list
        await fetchEventAttendance(selectedEvent);
        
        // Restart camera scanning after a brief delay
        setTimeout(() => {
          if (cameraOpen) {
            const video = document.getElementById('attendance-camera-video');
            if (video) {
              scanQRCode(video);
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error recording attendance';
      showMessage(`❌ ${errorMsg}`, 'error');
      
      // Restart scanning on error
      setTimeout(() => {
        if (cameraOpen) {
          const video = document.getElementById('attendance-camera-video');
          if (video) {
            scanQRCode(video);
          }
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendance = async (userId, status) => {
    try {
      setLoading(true);
      const response = await attendanceAPI.manualAttendance({
        user_id: userId,
        event_id: selectedEvent,
        status: status
      });

      if (response.status === 200 || response.status === 201) {
        showMessage(`✅ Attendance marked as ${status}`, 'success');
        await fetchEventAttendance(selectedEvent);
      }
    } catch (error) {
      console.error('Error with manual attendance:', error);
      showMessage(error.response?.data?.message || 'Error recording attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="attendance-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  if (!user?.is_officer) {
    return (
      <div className="access-denied fade-in">
        <div className="denied-content">
          <div className="denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Officer privileges are required to manage attendance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance">
      <div className="attendance-header">
        <h2>📋 Attendance Management</h2>
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
                {event.title} - {new Date(event.start_time).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="scanner-section">
        <h3>📷 QR Code Scanner</h3>
        {!cameraOpen ? (
          <div className="scanner-controls">
            <button 
              className="btn-camera-attendance btn-primary"
              onClick={startCamera}
              disabled={!selectedEvent || cameraOpen}
            >
              📷 Open Camera
            </button>
            <p className="scanner-note">Point your device camera at student QR codes to mark attendance</p>
          </div>
        ) : (
          <div className="camera-container-attendance">
            <div className="camera-header">
              <p>📹 Scanning QR Codes - Point camera at QR code</p>
              {loading && <span className="processing">Processing...</span>}
            </div>
            <video 
              id="attendance-camera-video"
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
                className="btn-close-camera"
                onClick={stopCamera}
              >
                ✕ Close Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="attendance-list">
          <h3>📊 Attendance Records</h3>
          <div className="attendance-stats">
            <div className="stat">
              <span className="stat-label">✅ Present:</span>
              <span className="stat-value">
                {attendanceData.filter(a => a.status === 'present').length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">❌ Absent:</span>
              <span className="stat-value">
                {attendanceData.filter(a => a.status === 'absent').length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">📈 Total:</span>
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
                {attendanceData.length > 0 ? (
                  attendanceData.map(record => (
                    <tr key={record.id}>
                      <td>{record.user?.first_name} {record.user?.last_name}</td>
                      <td>{record.user?.student_id}</td>
                      <td>
                        <span className={`status-badge status-${record.status}`}>
                          {record.status === 'present' ? '✅ Present' : '❌ Absent'}
                        </span>
                      </td>
                      <td>
                        {record.scanned_at ? 
                          new Date(record.scanned_at).toLocaleTimeString() : 
                          'Not recorded'
                        }
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-present"
                            onClick={() => handleManualAttendance(record.user_id, 'present')}
                            disabled={loading}
                          >
                            ✅ Present
                          </button>
                          <button 
                            className="btn-absent"
                            onClick={() => handleManualAttendance(record.user_id, 'absent')}
                            disabled={loading}
                          >
                            ❌ Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">No attendance records yet. Scan QR codes to add.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;