import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [successDelay, setSuccessDelay] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect after success
  useEffect(() => {
    if (success && successDelay > 0) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, successDelay);
      return () => clearTimeout(timer);
    }
  }, [success, successDelay, navigate]);

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
      const result = await register(formData);
      
      // Success message
      const successMsg = result.message || 'Registration successful! Your QR code has been generated. Redirecting to login...';
      setSuccess(successMsg);
      
      // Reset form
      setFormData({
        student_id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: ''
      });

      // Redirect after 3 seconds
      setSuccessDelay(3000);
      
    } catch (err) {
      console.error('Registration error:', err);
      
      // Better error message handling
      let errorMsg = 'Registration failed. Please try again.';
      
      if (err.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        errorMsg = Object.values(errors)
          .flat()
          .join(', ');
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
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
              ✓ {success}
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
              disabled={loading || success}
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
                disabled={loading || success}
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
                disabled={loading || success}
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
              disabled={loading || success}
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
                disabled={loading || success}
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
                disabled={loading || success}
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
            disabled={loading || success}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating Account...
              </>
            ) : success ? (
              <>
                <div className="spinner"></div>
                Redirecting to login...
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