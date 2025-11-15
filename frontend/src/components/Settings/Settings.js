// src/components/Settings/Settings.js
import React, { useState, useEffect } from 'react';
import { organizationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    attendance_fine: ''
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await organizationAPI.getOrganization();
      const org = response.data.organization;
      setOrganization(org);
      setSettings({
        name: org.name,
        attendance_fine: org.attendance_fine
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await organizationAPI.updateOrganization(settings);
      alert('Settings updated successfully!');
      fetchOrganization();
    } catch (error) {
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Organization Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <h3>General Settings</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Attendance Fine Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.attendance_fine}
                onChange={(e) => handleChange('attendance_fine', e.target.value)}
                required
              />
              <small>Amount to be charged for absent members per event</small>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        <div className="info-card">
          <h3>Organization Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Organization Code:</label>
              <span>{organization?.code}</span>
            </div>
            <div className="info-item">
              <label>Total Members:</label>
              <span>{organization?.total_members}</span>
            </div>
            <div className="info-item">
              <label>Total Officers:</label>
              <span>{organization?.total_officers}</span>
            </div>
            <div className="info-item">
              <label>Total Events:</label>
              <span>{organization?.total_events}</span>
            </div>
          </div>
        </div>

        <div className="quick-stats">
          <h3>Quick Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{organization?.total_members}</div>
              <div className="stat-label">Total Members</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{organization?.total_officers}</div>
              <div className="stat-label">Officers</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{organization?.total_events}</div>
              <div className="stat-label">Events</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;