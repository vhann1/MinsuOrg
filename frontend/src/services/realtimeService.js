// Real-Time Service for Socket.IO Communication
// Handles all WebSocket connections and event listeners

import io from 'socket.io-client';

// Use environment variable or default to network IP for development
// For localhost only: http://localhost:3001
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://192.168.1.19:3001';

let socket = null;
let listeners = {};

export const realtimeService = {
  /**
   * Initialize Socket.IO connection
   */
  connect: () => {
    if (socket && socket.connected) {
      console.log('✅ Socket already connected');
      return socket;
    }

    console.log('🔌 Connecting to real-time server...');

    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // Connection success
    socket.on('connect', () => {
      console.log('✅ Connected to real-time server:', socket.id);
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected:', reason);
    });

    // Joined user channel
    socket.on('joined', (data) => {
      console.log('✅ Joined user channel:', data.userId);
    });

    return socket;
  },

  /**
   * Disconnect from Socket.IO
   */
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      listeners = {};
      console.log('🔌 Disconnected from real-time server');
    }
  },

  /**
   * Join user-specific channel
   */
  joinUserChannel: (userId) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.emit('join-user', userId);
    console.log(`📨 Joined user channel for user ${userId}`);
  },

  /**
   * Join organization channel
   */
  joinOrganizationChannel: (orgId) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.emit('join-organization', orgId);
    console.log(`🏢 Joined organization channel for org ${orgId}`);
  },

  /**
   * Leave user channel
   */
  leaveUserChannel: (userId) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.emit('leave-user', userId);
    console.log(`🚪 Left user channel for user ${userId}`);
  },

  /**
   * Listen for attendance recorded event
   */
  onAttendanceRecorded: (callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.on('attendance-recorded', (data) => {
      console.log('📍 Attendance recorded:', data);
      callback(data);
    });

    listeners.attendanceRecorded = callback;
  },

  /**
   * Listen for financial ledger update
   */
  onFinancialLedgerUpdated: (callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.on('financial-ledger-updated', (data) => {
      console.log('💰 Financial ledger updated:', data);
      callback(data);
    });

    listeners.financialLedgerUpdated = callback;
  },

  /**
   * Listen for event created
   */
  onEventCreated: (callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.on('event-created', (data) => {
      console.log('📅 Event created:', data);
      callback(data);
    });

    listeners.eventCreated = callback;
  },

  /**
   * Listen for event updated
   */
  onEventUpdated: (callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.on('event-updated', (data) => {
      console.log('✏️ Event updated:', data);
      callback(data);
    });

    listeners.eventUpdated = callback;
  },

  /**
   * Listen for member added
   */
  onMemberAdded: (callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.on('member-added', (data) => {
      console.log('👤 Member added:', data);
      callback(data);
    });

    listeners.memberAdded = callback;
  },

  /**
   * Generic event listener - Returns unsubscribe function
   */
  on: (eventName, callback) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      // Return a dummy unsubscribe function to prevent errors
      return () => {};
    }

    socket.on(eventName, (data) => {
      console.log(`📨 Event received: ${eventName}`, data);
      callback(data);
    });

    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(callback);

    // Return unsubscribe function
    return () => {
      socket.off(eventName);
      if (listeners[eventName]) {
        listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
      }
    };
  },

  /**
   * Generic event emitter
   */
  emit: (eventName, data) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    socket.emit(eventName, data);
    console.log(`📤 Emitted: ${eventName}`, data);
  },

  /**
   * Get socket instance
   */
  getSocket: () => socket,

  /**
   * Check if connected
   */
  isConnected: () => socket && socket.connected,

  /**
   * Remove all listeners
   */
  removeAllListeners: () => {
    if (socket) {
      socket.removeAllListeners();
      listeners = {};
      console.log('🧹 All listeners removed');
    }
  }
};

export default realtimeService;
