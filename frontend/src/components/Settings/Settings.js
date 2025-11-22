// src/components/Settings/Settings.js
import React, { useState, useEffect } from 'react';
import { organizationAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Settings.css';

const Settings = () => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    attendance_fine: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await organizationAPI.getOrganization();
      const org = response.data.organization;
      setOrganization(org);
      setSettings({
        name: org.name,
        attendance_fine: org.attendance_fine
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await organizationAPI.updateOrganization(settings);
      
      // Update local state immediately
      setOrganization(response.data.organization || organization);
      setSettings({
        name: response.data.organization?.name || settings.name,
        attendance_fine: response.data.organization?.attendance_fine || settings.attendance_fine
      });
      setHasChanges(false);
      
      toast.success('✅ Settings updated successfully in real-time!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error.response?.data?.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ Organization Settings</h1>
        <p>Manage your organization settings and configuration</p>
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
                placeholder="Enter organization name"
                required
              />
              <small>Your organization's official name</small>
            </div>

            <div className="form-group">
              <label>Attendance Fine Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.attendance_fine}
                onChange={(e) => handleChange('attendance_fine', e.target.value)}
                placeholder="0.00"
                required
              />
              <small>Amount charged per absent student per event</small>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving || !hasChanges}
              >
                {saving ? '💾 Saving...' : '💾 Save Settings'}
              </button>
              {hasChanges && (
                <p className="unsaved-notice">⚠️ You have unsaved changes</p>
              )}
            </div>
          </form>
        </div>

        <div className="info-card">
          <h3>Organization Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Organization Code:</label>
              <span>{organization?.code || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Total Members:</label>
              <span>{organization?.total_members || 0}</span>
            </div>
            <div className="info-item">
              <label>Total Officers:</label>
              <span>{organization?.total_officers || 0}</span>
            </div>
            <div className="info-item">
              <label>Total Events:</label>
              <span>{organization?.total_events || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;