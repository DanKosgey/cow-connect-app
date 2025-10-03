import { ApiError, NetworkError, ValidationError, PermissionError, RateLimitError } from '@/types/error';

export class ErrorHandler {
  static handleApiError(error: any): ApiError {
    // If it's already an ApiError, return it
    if (error && typeof error === 'object' && 'code' in error) {
      return error as ApiError;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        error: 'NETWORK_ERROR',
        message: 'Cannot connect to server. Please check your internet connection.',
        code: 0,
        timestamp: new Date().toISOString(),
        trace_id: this.generateTraceId(),
      };
    }

    // Handle HTTP errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      const message = (error as any).message || 'An unknown error occurred';
      
      switch (status) {
        case 400:
          return {
            error: 'BAD_REQUEST',
            message: 'Invalid request. Please check your input and try again.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        case 401:
          return {
            error: 'UNAUTHORIZED',
            message: 'Your session has expired. Please log in again.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        case 403:
          return {
            error: 'FORBIDDEN',
            message: 'You do not have permission to perform this action.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        case 404:
          return {
            error: 'NOT_FOUND',
            message: 'The requested resource was not found.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        case 429:
          return {
            error: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        case 500:
          return {
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong on our end. Please try again later.',
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
        default:
          return {
            error: 'HTTP_ERROR',
            message: `HTTP ${status}: ${message}`,
            code: status,
            timestamp: new Date().toISOString(),
            trace_id: this.generateTraceId(),
          };
      }
    }

    // Handle generic errors
    return {
      error: 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred',
      code: 500,
      timestamp: new Date().toISOString(),
      trace_id: this.generateTraceId(),
    };
  }

  static handleValidationError(errors: Record<string, string>): ValidationError[] {
    return Object.entries(errors).map(([field, error]) => ({
      field,
      error,
    }));
  }

  static handleNetworkError(error: Error): NetworkError {
    return {
      message: 'Network error: ' + error.message,
      status: (error as any).status,
      url: (error as any).url,
      timestamp: new Date(),
    };
  }

  static handlePermissionError(requiredPermission: string, userRole: string): PermissionError {
    return {
      message: `You need ${requiredPermission} permission to perform this action.`,
      requiredPermission,
      userRole,
    };
  }

  static handleRateLimitError(retryAfter: number, limit: number, remaining: number): RateLimitError {
    const resetTime = new Date();
    resetTime.setSeconds(resetTime.getSeconds() + retryAfter);
    
    return {
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      limit,
      remaining,
      resetTime,
    };
  }

  static generateTraceId(): string {
    return 'trace_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // If this is the last retry, throw the error
        if (i === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

export const errorMessages = {
  NETWORK_ERROR: 'Cannot connect to server. Check your internet connection.',
  AUTH_ERROR: 'Your session has expired. Please log in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  RATE_LIMIT_ERROR: 'Too many requests. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  OFFLINE_ERROR: 'You are currently offline. Please check your connection.',
};

export default ErrorHandler;