import { PostgrestError } from '@supabase/supabase-js';
import { logger } from './logger';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ERROR'
  | 'REFERENCE_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'STORAGE_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'TIMEOUT_ERROR'
  | 'CONFIG_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR';

export const ErrorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Invalid data provided',
  DUPLICATE_ERROR: 'Record already exists',
  REFERENCE_ERROR: 'Invalid reference data',
  NETWORK_ERROR: 'Network connection error',
  AUTH_ERROR: 'Authentication failed',
  STORAGE_ERROR: 'Storage operation failed',
  PERMISSION_ERROR: 'Permission denied',
  NOT_FOUND_ERROR: 'Resource not found',
  TIMEOUT_ERROR: 'Request timed out',
  CONFIG_ERROR: 'System configuration error',
  RATE_LIMIT_ERROR: 'Too many requests',
  UNKNOWN_ERROR: 'An unexpected error occurred'
};

export class RegistrationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}

export function handleSupabaseError(error: PostgrestError): RegistrationError {
  switch (error.code) {
    case '23505': // Unique violation
      return new RegistrationError(
        'This record already exists',
        'DUPLICATE_ERROR',
        error,
        409
      );

    case '23503': // Foreign key violation
      return new RegistrationError(
        'Invalid reference data',
        'REFERENCE_ERROR',
        error,
        400
      );

    case '23514': // Check constraint violation
      let message = 'Invalid data';
      if (error.message?.includes('status_check')) {
        message = 'Invalid status value';
      } else if (error.message?.includes('feeding_type_check')) {
        message = 'Invalid feeding type';
      }
      return new RegistrationError(message, 'VALIDATION_ERROR', error, 400);

    case 'PGRST504': // Timeout
      return new RegistrationError(
        'The request timed out, please try again',
        'TIMEOUT_ERROR',
        error,
        504
      );

    case '42P01': // Undefined table
      return new RegistrationError(
        'System configuration error',
        'CONFIG_ERROR',
        error,
        500
      );

    default:
      return new RegistrationError(
        'An unexpected error occurred',
        'UNKNOWN_ERROR',
        error,
        500
      );
  }
}

export function handleStorageError(error: Error): RegistrationError {
  const message = error.message || 'Storage operation failed';
  
  switch (true) {
    case message.includes('size exceeds'):
      return new RegistrationError(
        'File too large. Maximum size is 5MB.',
        'VALIDATION_ERROR',
        error
      );
      
    case message.includes('not found'):
      return new RegistrationError(
        'Storage location not found.',
        'NOT_FOUND_ERROR',
        error
      );
      
    case message.includes('permission'):
      return new RegistrationError(
        'You do not have permission to perform this operation.',
        'PERMISSION_ERROR',
        error
      );
      
    case message.includes('invalid token'):
      return new RegistrationError(
        'Authentication error. Please sign in again.',
        'AUTH_ERROR',
        error
      );
      
    default:
      return new RegistrationError(
        'Failed to access storage. Please try again.',
        'STORAGE_ERROR',
        error
      );
  }
}

export function handleAuthError(error: Error): RegistrationError {
  const message = error.message || ErrorMessages.AUTH_ERROR;

  switch (true) {
    case message.includes('already registered'):
      return new RegistrationError(
        'An account with this email already exists',
        'DUPLICATE_ERROR',
        error
      );

    case message.includes('invalid email'):
      return new RegistrationError(
        'Please enter a valid email address',
        'VALIDATION_ERROR',
        error
      );

    case message.includes('weak password'):
      return new RegistrationError(
        'Password is too weak. It must include uppercase, lowercase, number, and special character',
        'VALIDATION_ERROR',
        error
      );

    case message.includes('too many requests'):
      return new RegistrationError(
        'Too many attempts. Please try again later',
        'RATE_LIMIT_ERROR',
        error
      );

    case message.includes('invalid token') || message.includes('expired'):
      return new RegistrationError(
        'Your session has expired. Please sign in again',
        'AUTH_ERROR',
        error
      );

    default:
      return new RegistrationError(
        message,
        'AUTH_ERROR',
        error
      );
  }
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    logger.error(`Error in ${context}:`, error);

    if (error instanceof RegistrationError) {
      throw error;
    }

    if (error?.message?.includes('TypeError: Failed to fetch')) {
      throw new RegistrationError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        error,
        0
      );
    }

    throw new RegistrationError(
      error?.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      error,
      500
    );
  }
}