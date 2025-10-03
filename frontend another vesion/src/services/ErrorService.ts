import { ApiError, ErrorReport, ErrorContext, ValidationError } from '@/types/error';
import { useAuth } from '@/contexts/AuthContext';
import { connectivityChecker } from '@/utils/connectivityChecker';

// We'll import the toast function directly since we can't use the hook outside of React components
// For now, we'll use a placeholder that will be replaced with the actual toast implementation
let toastFunction: ((type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void) | null = null;

// Function to set the toast function from a React component
export const setToastFunction = (fn: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void) => {
  toastFunction = fn;
};

class ErrorService {
  private static instance: ErrorService;
  
  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  // Generate a unique trace ID for error tracking
  private generateTraceId(): string {
    return 'err_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Show user-friendly error messages using toast notifications
  private showUserMessage(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    console.log(`[${type.toUpperCase()}]: ${message}`);
    
    // Use toast notification if available, otherwise fall back to console
    if (toastFunction) {
      toastFunction(type, type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info', message);
    } else {
      // Fallback to console in case toast is not available
      console[type](message);
    }
  }

  // Handle API errors based on status codes
  handleApiError(error: any, context?: ErrorContext): ApiError {
    console.error('API Error:', error);
    
    // Default error structure
    const defaultError: ApiError = {
      error: 'unknown_error',
      message: 'An unexpected error occurred',
      code: 500,
      timestamp: new Date().toISOString(),
      trace_id: this.generateTraceId()
    };

    // Handle different error types
    if (error instanceof Response) {
      // HTTP error response
      // Note: We need to handle this synchronously, so we'll create a simplified version
      const traceId = error.headers.get('X-Trace-Id') || this.generateTraceId();
      
      return {
        error: 'http_error',
        message: error.statusText || 'HTTP Error',
        code: error.status,
        timestamp: new Date().toISOString(),
        trace_id: traceId
      };
    } else if (error instanceof Error) {
      // JavaScript Error object
      return {
        ...defaultError,
        message: error.message,
        error: 'client_error'
      };
    } else if (typeof error === 'object' && error !== null) {
      // Custom error object
      return {
        ...defaultError,
        ...error
      };
    }

    return defaultError;
  }

  // Handle authentication errors (401)
  handleAuthError(): void {
    console.warn('Authentication error - redirecting to login');
    
    // Clear any stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Show a toast notification before redirecting
    this.showUserMessage('Your session has expired. Please log in again.', 'warning');
    
    // Redirect to login page after a short delay to allow the toast to be seen
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  // Handle permission errors (403)
  handlePermissionError(message: string = 'You do not have permission for this action'): void {
    console.warn('Permission error:', message);
    
    // Show permission denied message to user
    this.showUserMessage(message, 'error');
  }

  // Handle validation errors (422)
  handleValidationError(details: Record<string, any>): Record<string, string> {
    console.warn('Validation error:', details);
    
    const validationErrors: Record<string, string> = {};
    
    if (Array.isArray(details)) {
      // Handle array format
      details.forEach((error: any) => {
        if (error.field && error.error) {
          validationErrors[error.field] = error.error;
        }
      });
    } else if (typeof details === 'object') {
      // Handle object format
      Object.keys(details).forEach(key => {
        validationErrors[key] = details[key];
      });
    }
    
    // Show first validation error to user
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      this.showUserMessage(firstError, 'error');
    }
    
    return validationErrors;
  }

  // Handle rate limit errors (429)
  handleRateLimitError(retryAfter: number): void {
    console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    
    const message = `Too many requests. Please try again in ${retryAfter} seconds.`;
    this.showUserMessage(message, 'warning');
  }

  // Handle network errors
  handleNetworkError(): void {
    console.warn('Network error occurred');
    
    // Mark server as potentially down
    connectivityChecker.markServerAsDown();
    
    const message = 'Network connection failed. Please check your internet connection and try again.';
    this.showUserMessage(message, 'error');
  }

  // Handle offline errors
  handleOfflineError(): void {
    console.warn('Application is offline');
    
    const message = 'You are currently offline. Some features may be unavailable.';
    this.showUserMessage(message, 'warning');
  }

  // Report error to monitoring service
  reportError(error: Error, context?: ErrorContext): void {
    const errorReport: ErrorReport = {
      id: this.generateTraceId(),
      error,
      context: context || {
        component: 'Unknown',
        action: 'Unknown',
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        route: window.location.pathname
      },
      stackTrace: error.stack,
      reportedAt: new Date()
    };
    
    // In a real implementation, this would send to a monitoring service like Sentry
    console.log('Reporting error:', errorReport);
  }

  // Process error and determine appropriate action
  processError(error: any, context?: ErrorContext): ApiError {
    // Handle different error types
    if (error instanceof Response) {
      const apiError = this.handleApiError(error, context);
      
      // Handle specific status codes
      switch (apiError.code) {
        case 401:
          this.handleAuthError();
          break;
        case 403:
          this.handlePermissionError(apiError.message);
          break;
        case 422:
          if (apiError.details) {
            this.handleValidationError(apiError.details);
          }
          break;
        case 429:
          // Extract retryAfter from details if available
          const retryAfter = apiError.details?.retryAfter || 60;
          this.handleRateLimitError(retryAfter);
          break;
        case 500:
          // Mark server as down for 500 errors
          connectivityChecker.markServerAsDown();
          this.showUserMessage('An unexpected server error occurred. Please try again later.', 'error');
          break;
        default:
          this.showUserMessage(apiError.message, 'error');
      }
      
      return apiError;
    } else {
      // Handle non-HTTP errors
      return this.handleApiError(error, context);
    }
  }
}

export default ErrorService;