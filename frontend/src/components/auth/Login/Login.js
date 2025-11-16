import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData);
      
      console.log('Login result:', result);
      
      // FIX: Check both is_officer and role for compatibility
      const isOfficer = result.user.is_officer || result.user.role === 'officer' || result.user.role === 'admin';
      
      if (isOfficer) {
        console.log('Redirecting to dashboard (officer)');
        navigate('/dashboard');
      } else {
        console.log('Redirecting to profile (student)');
        navigate('/user-profile');
      }
    } catch (err) {
      console.error('Login error details:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user starts typing
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <h1>MINSU OrgSuite</h1>
            <p>Organization Management System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account</p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="auth-footer">
            <p>
              Student?{' '}
              <a href="/register" className="link">Register here</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;