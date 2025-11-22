// Enhanced API service with automatic notifications
// Wraps all API calls with success/error notifications

import { notificationService } from './notificationService';

/**
 * Wraps API calls with automatic notification handling
 */
export const withNotifications = (apiCall, options = {}) => {
  const {
    successMessage = null,
    errorMessage = null,
    showLoading = true,
    loadingMessage = 'Processing...'
  } = options;

  return async (...args) => {
    let toastId = null;

    try {
      // Show loading if enabled
      if (showLoading) {
        toastId = notificationService.loading(loadingMessage);
      }

      // Execute API call
      const response = await apiCall(...args);

      // Update or dismiss loading toast
      if (toastId !== null && showLoading) {
        notificationService.dismiss(toastId);
      }

      // Show success message
      if (successMessage) {
        notificationService.success(successMessage);
      }

      return response;
    } catch (error) {
      // Dismiss loading toast
      if (toastId !== null && showLoading) {
        notificationService.dismiss(toastId);
      }

      // Extract error message
      let message = errorMessage || 'An error occurred';

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        message = errors.join(', ');
      } else if (error.message) {
        message = error.message;
      }

      // Show error notification
      notificationService.error(message);

      throw error;
    }
  };
};

/**
 * Quick helpers for common operations
 */
export const notificationHelpers = {
  /**
   * Wrap successful operations
   */
  success: (message) => {
    notificationService.success(message);
  },

  /**
   * Wrap error operations
   */
  error: (message) => {
    notificationService.error(message);
  },

  /**
   * Show loading state during operation
   */
  async withLoading(message, asyncFn) {
    const toastId = notificationService.loading(message);
    try {
      const result = await asyncFn();
      notificationService.dismiss(toastId);
      return result;
    } catch (error) {
      notificationService.dismiss(toastId);
      throw error;
    }
  },

  /**
   * Show operation result
   */
  result: (promise, successMsg, errorMsg) => {
    return notificationService.promise(promise, {
      pending: 'Processing...',
      success: successMsg || 'Success!',
      error: errorMsg || 'Error!'
    });
  }
};

export default withNotifications;
