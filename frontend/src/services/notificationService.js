// Notification Service - Wrapper around react-toastify
// Provides consistent notification interface across the app

import { toast } from 'react-toastify';

export const notificationService = {
  /**
   * Show success notification
   */
  success: (message, options = {}) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  /**
   * Show error notification
   */
  error: (message, options = {}) => {
    toast.error(message, {
      position: 'bottom-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  /**
   * Show info notification
   */
  info: (message, options = {}) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  /**
   * Show warning notification
   */
  warning: (message, options = {}) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  /**
   * Show loading notification (promise-based)
   */
  promise: async (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        pending: messages.pending || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error!'
      },
      {
        position: 'bottom-right',
        autoClose: 3000,
        ...options
      }
    );
  },

  /**
   * Show loading toast
   */
  loading: (message, options = {}) => {
    return toast.loading(message || 'Loading...', {
      position: 'bottom-right',
      ...options
    });
  },

  /**
   * Update a toast
   */
  update: (toastId, options = {}) => {
    toast.update(toastId, {
      autoClose: 3000,
      ...options
    });
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },

  /**
   * Dismiss specific toast
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  }
};

export default notificationService;
