
import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    student_id: '',
    phone: '',
    department: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/current-user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          student_id: userData.student_id || '',
          phone: userData.phone || '',
          department: userData.department || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setIsEditing(false);
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error updating profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const generateNewQR = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        }
      });

      if (response.ok) {
        setMessage('New QR code generated successfully!');
        setTimeout(() => setMessage(''), 3000);
        fetchUserData(); // Refresh user data to get new QR code
      } else {
        setMessage('Error generating QR code');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      setMessage('Error generating QR code');
    }
  };

  if (loading && !user) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>User Profile</h2>
        {!isEditing && (
          <button 
            className="btn-edit"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="profile-content">
        <div className="profile-info">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Student ID</label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name || '',
                      email: user.email || '',
                      student_id: user.student_id || '',
                      phone: user.phone || '',
                      department: user.department || ''
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="detail-item">
                <label>Full Name:</label>
                <span>{user?.name || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <span>{user?.email}</span>
              </div>
              <div className="detail-item">
                <label>Student ID:</label>
                <span>{user?.student_id || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <span>{user?.phone || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label>Department:</label>
                <span>{user?.department || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label>Role:</label>
                <span className="role-badge">{user?.role}</span>
              </div>
            </div>
          )}
        </div>

        <div className="qr-section">
          <h3>Your QR Code</h3>
          {user?.qr_code ? (
            <div className="qr-container">
              <img 
                src={`/storage/${user.qr_code}`} 
                alt="QR Code" 
                className="qr-image"
              />
              <button 
                className="btn-generate-qr"
                onClick={generateNewQR}
              >
                Generate New QR Code
              </button>
              <p className="qr-note">
                Show this QR code at events for attendance scanning
              </p>
            </div>
          ) : (
            <div className="no-qr">
              <p>No QR code generated yet</p>
              <button 
                className="btn-generate-qr"
                onClick={generateNewQR}
              >
                Generate QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;