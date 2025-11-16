import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    student_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await register(formData);
      setSuccess('Registration successful! Please wait for admin approval before logging in.');
      setFormData({
        student_id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: ''
      });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <h1>MINSU OrgSuite</h1>
            <p>Student Registration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Register as a student</p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="student_id">Student ID *</label>
            <input
              type="text"
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="Enter your student ID"
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter your last name"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password (min. 8 characters)"
                required
                disabled={loading}
                minLength="8"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password_confirmation">Confirm Password *</label>
              <input
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                disabled={loading}
                minLength="8"
              />
            </div>
          </div>

          <div className="form-note">
            <p>All fields marked with * are required</p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <a href="/login" className="link">Sign in here</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;