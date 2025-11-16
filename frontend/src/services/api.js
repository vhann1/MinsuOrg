import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This is CRITICAL for cookies and sessions
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
});

// CSRF token management
let csrfToken = null;

// Initialize CSRF token
export const initializeCSRF = async () => {
  try {
    console.log('Initializing CSRF token...');
    await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
      withCredentials: true
    });
    
    // Extract CSRF token from cookies
    csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    
    console.log('CSRF token initialized:', csrfToken ? 'Success' : 'Failed');
    return csrfToken;
  } catch (error) {
    console.error('CSRF initialization failed:', error);
    return null;
  }
};

// Request interceptor
api.interceptors.request.use(async (config) => {
  console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
  
  // Add CSRF token for state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    if (!csrfToken) {
      await initializeCSRF();
    }
    
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
      console.log('Added CSRF token to request');
    }
  }

  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Added auth token to request');
  }
  
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response received: ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('Unauthorized, redirecting to login...');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 419) {
      console.log('CSRF token mismatch, reinitializing...');
      csrfToken = null;
      // You might want to retry the request here
    }
    
    if (error.response?.status === 500) {
      console.log('Server error, check Laravel logs');
    }
    
    return Promise.reject(error);
  }
);

// Initialize CSRF on import
initializeCSRF().then(token => {
  console.log('CSRF initialization complete');
}).catch(error => {
  console.error('CSRF initialization error:', error);
});

// Auth API
export const authAPI = {
  login: async (credentials) => {
    console.log('Attempting login...');
    await initializeCSRF();
    return api.post('/api/login', credentials);
  },
  
  logout: async () => {
    console.log('Attempting logout...');
    await initializeCSRF();
    return api.post('/api/logout');
  },
  
  register: async (userData) => {
    console.log('Attempting registration...');
    await initializeCSRF();
    return api.post('/api/register', userData);
  },
  
  getProfile: () => api.get('/api/me'),
  updateProfile: (data) => api.put('/api/profile', data),
};

// Users API
export const usersAPI = {
  getCurrentUser: () => api.get('/api/user'), // FIX: Match Laravel endpoint
  // ... rest of your existing methods
  getOrganizationMembers: () => api.get('/api/users/organization-members'),
  getScanners: () => api.get('/api/users/scanners'),
  createUser: (data) => api.post('/api/users', data),
  getUser: (id) => api.get(`/api/users/${id}`),
  updateUser: (id, data) => api.put(`/api/users/${id}`, data),
  deleteUser: (id) => api.delete(`/api/users/${id}`),
  addToOrganization: (id, data) => api.post(`/api/users/${id}/add-to-organization`, data),
  removeFromOrganization: (id) => api.post(`/api/users/${id}/remove-from-organization`),
  updateScanPermission: (id, data) => api.put(`/api/users/${id}/scan-permission`, data),
  generateQR: (id) => api.post(`/api/users/${id}/generate-qr`),
};

// Events API
export const eventsAPI = {
  getEvents: () => api.get('/api/events'),
  getActiveEvents: () => api.get('/api/events/active'),
  createEvent: (data) => api.post('/api/events', data),
  getEvent: (id) => api.get(`/api/events/${id}`),
  updateEvent: (id, data) => api.put(`/api/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/api/events/${id}`),
  toggleActive: (id) => api.post(`/api/events/${id}/toggle-active`),
  getEventStats: (id) => api.get(`/api/events/${id}/stats`),
  getEventAttendance: (id) => api.get(`/api/events/${id}/attendance-details`),
  markAbsent: (id) => api.post(`/api/events/${id}/mark-absent`),
  getEventsNeedingAbsentMarking: () => api.get('/api/events/needing-absent-marking'),
  processAllExpiredEvents: () => api.post('/api/events/process-expired'),
};

// Financial API
export const financialAPI = {
  getOrganizationFinancials: () => api.get('/api/financial/organization'),
  getStudentLedger: (userId) => api.get(`/api/financial/student-ledger/${userId}`),
  getMemberLedger: (userId) => api.get(`/api/financial/member-ledger/${userId}`),
  makePayment: (data) => api.post('/api/financial/make-payment', data),
  addManualEntry: (data) => api.post('/api/financial/manual-entry', data),
  applyFine: (data) => api.post('/api/financial/apply-fine', data),
  getFinancialOverview: () => api.get('/api/financial/overview'),
};

// Attendance API
export const attendanceAPI = {
  scanQR: (data) => api.post('/api/attendance/scan', data),
  getEventAttendance: (eventId) => api.get(`/api/events/${eventId}/attendance`),
  manualAttendance: (data) => api.post('/api/attendance/manual', data),
  getUserAttendance: (userId) => api.get(`/api/attendance/user/${userId}`),
  getUserAttendanceHistory: (userId) => api.get(`/api/attendance/user/${userId}`),
};

// Dashboard API
export const dashboardAPI = {
  getDashboardData: () => api.get('/api/dashboard'),
  clearCache: () => api.post('/api/dashboard/clear-cache'),
  getFinancialOverview: () => api.get('/api/financial/overview'),
};

// Organization API
export const organizationAPI = {
  getOrganization: () => api.get('/api/organization'),
  updateOrganization: (data) => api.put('/api/organization', data),
  getOrganizationStats: () => api.get('/api/organization/stats'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/api/health'),
  getCSRFToken: () => api.get('/api/csrf-token'),
};

export default api;