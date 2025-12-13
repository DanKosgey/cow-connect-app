import { logger } from '@/utils/logger';

/**
 * Authentication error handler utility
 * Provides consistent error handling for authentication-related operations
 */

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  SESSION_EXPIRED = 'session_expired',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  USER_NOT_FOUND = 'user_not_found',
  ACCOUNT_LOCKED = 'account_locked',
  RATE_LIMITED = 'rate_limited'
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: any;
}

/**
 * Parse and categorize authentication errors
 */
export const parseAuthError = (error: any): AuthError => {
  if (!error) {
    return {
      code: AuthErrorCode.SERVER_ERROR,
      message: 'An unknown error occurred'
    };
  }

  // Handle Supabase auth errors
  if (error.name === 'AuthApiError' || error.message?.includes('Invalid login credentials')) {
    return {
      code: AuthErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid email or password',
      originalError: error
    };
  }

  if (error.message?.includes('Email not confirmed')) {
    return {
      code: AuthErrorCode.USER_NOT_FOUND,
      message: 'Please verify your email address before signing in',
      originalError: error
    };
  }

  // Handle session expiration
  if (error.message?.includes('JWT expired') || error.message?.includes('session')) {
    return {
      code: AuthErrorCode.SESSION_EXPIRED,
      message: 'Your session has expired. Please sign in again.',
      originalError: error
    };
  }

  // Handle network errors
  if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
    return {
      code: AuthErrorCode.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection and try again.',
      originalError: error
    };
  }

  // Handle rate limiting
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return {
      code: AuthErrorCode.RATE_LIMITED,
      message: 'Too many requests. Please wait a moment and try again.',
      originalError: error
    };
  }

  // Handle server errors
  if (error.status >= 500) {
    return {
      code: AuthErrorCode.SERVER_ERROR,
      message: 'Server error. Please try again later.',
      originalError: error
    };
  }

  // Default error
  return {
    code: AuthErrorCode.SERVER_ERROR,
    message: error.message || 'An error occurred during authentication',
    originalError: error
  };
};

/**
 * Handle authentication errors with appropriate user feedback
 */
export const handleAuthError = (error: any): AuthError => {
  const parsedError = parseAuthError(error);
  
  logger.error('Authentication error', {
    code: parsedError.code,
    message: parsedError.message,
    originalError: parsedError.originalError
  });

  return parsedError;
};

/**
 * Check if error indicates session has expired
 */
export const isSessionExpiredError = (error: any): boolean => {
  if (!error) return false;
  
  const authError = parseAuthError(error);
  return authError.code === AuthErrorCode.SESSION_EXPIRED;
};

/**
 * Check if error is recoverable
 */
export const isRecoverableError = (error: any): boolean => {
  if (!error) return true;
  
  const authError = parseAuthError(error);
  return [
    AuthErrorCode.NETWORK_ERROR,
    AuthErrorCode.SESSION_EXPIRED,
    AuthErrorCode.SERVER_ERROR,
    AuthErrorCode.RATE_LIMITED
  ].includes(authError.code);
};