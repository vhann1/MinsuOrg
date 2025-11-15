// src/services/authAPI.js
import api from './api';

export const authAPI = {
  // Get CSRF token from your API route
  async getCsrfToken() {
    try {
      const response = await api.get('/api/csrf-token');
      console.log('CSRF token obtained:', response.data.csrf_token);
      return response.data.csrf_token;
    } catch (error) {
      console.error('CSRF token failed:', error);
      throw error;
    }
  },

  async login(credentials) {
    try {
      console.log('Step 1: Getting CSRF token...');
      const csrfToken = await this.getCsrfToken();
      
      console.log('Step 2: Making login request with CSRF token...');
      const response = await api.post('/api/login', credentials, {
        headers: {
          'X-CSRF-TOKEN': csrfToken // Use the token from API route
        }
      });
      console.log('Login successful!', response.status);
      return response;
    } catch (error) {
      console.error('Login failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  async logout() {
    const csrfToken = await this.getCsrfToken();
    return api.post('/api/logout', {}, {
      headers: {
        'X-CSRF-TOKEN': csrfToken
      }
    });
  },

  async getMe() {
    return api.get('/api/me');
  }
};

export default authAPI;