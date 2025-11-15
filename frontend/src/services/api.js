// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Auto-logout due to 401');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Individual API groups
export const dashboardAPI = {
  getDashboard: () => api.get('/api/dashboard'),
  clearCache: () => api.post('/api/dashboard/clear-cache'),
};

export const usersAPI = {
  getOrganizationMembers: () => api.get('/api/users/organization-members'),
  getScanners: () => api.get('/api/users/scanners'), // ADD THIS LINE
  createUser: (data) => api.post('/api/users', data),
  getUser: (id) => api.get(`/api/users/${id}`),
  updateUser: (id, data) => api.put(`/api/users/${id}`, data),
  deleteUser: (id) => api.delete(`/api/users/${id}`),
  generateQR: (id) => api.post(`/api/users/generate-qr/${id}`),
};

export const eventsAPI = {
  getEvents: () => api.get('/api/events'),
  getActiveEvents: () => api.get('/api/events/active'),
  createEvent: (data) => api.post('/api/events', data),
  getEvent: (id) => api.get(`/api/events/${id}`),
  updateEvent: (id, data) => api.put(`/api/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/api/events/${id}`),
  toggleActive: (id) => api.post(`/api/events/${id}/toggle-active`),
  getEventAttendance: (eventId) => api.get(`/api/events/${eventId}/attendance`),
};

export const attendanceAPI = {
  scanQR: (data) => api.post('/api/attendance/scan', data),
  markAbsent: (eventId) => api.post(`/api/events/${eventId}/mark-absent`),
  manualAttendance: (data) => api.post('/api/attendance/manual', data),
  getEventAttendance: (eventId) => api.get(`/api/events/${eventId}/attendance`),
};

export const financialAPI = {
  getStudentLedger: (userId) => api.get(`/api/financial/student-ledger/${userId}`),
  getOrganizationFinancials: () => api.get('/api/financial/organization'),
  makePayment: (data) => api.post('/api/financial/make-payment', data),
  addManualEntry: (data) => api.post('/api/financial/manual-entry', data),
};

export const organizationAPI = {
  getOrganization: () => api.get('/api/organization'),
  updateOrganization: (data) => api.put('/api/organization', data),
};