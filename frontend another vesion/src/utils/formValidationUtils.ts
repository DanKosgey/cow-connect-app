/**
 * Comprehensive form validation utilities
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  generalError?: string;
}

/**
 * Validate required fields
 */
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

/**
 * Validate phone number (Kenyan format)
 */
export const validatePhone = (phone: string): string | null => {
  const phoneRegex = /^(\+?254|0)?([17]\d{8})$/;
  if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
    return 'Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)';
  }
  return null;
};

/**
 * Validate numeric values with min/max
 */
export const validateNumber = (
  value: number,
  min?: number,
  max?: number,
  fieldName?: string
): string | null => {
  if (isNaN(value)) {
    return fieldName ? `${fieldName} must be a valid number` : 'Must be a valid number';
  }
  
  if (min !== undefined && value < min) {
    return fieldName ? `${fieldName} must be at least ${min}` : `Must be at least ${min}`;
  }
  
  if (max !== undefined && value > max) {
    return fieldName ? `${fieldName} must not exceed ${max}` : `Must not exceed ${max}`;
  }
  
  return null;
};

/**
 * Validate string length
 */
export const validateStringLength = (
  value: string,
  minLength?: number,
  maxLength?: number,
  fieldName?: string
): string | null => {
  if (minLength !== undefined && value.length < minLength) {
    return fieldName ? `${fieldName} must be at least ${minLength} characters` : `Must be at least ${minLength} characters`;
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return fieldName ? `${fieldName} must not exceed ${maxLength} characters` : `Must not exceed ${maxLength} characters`;
  }
  
  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
  }
  
  return null;
};

/**
 * Validate that two fields match (e.g., password confirmation)
 */
export const validateMatch = (value1: string, value2: string, fieldName: string): string | null => {
  if (value1 !== value2) {
    return `${fieldName} do not match`;
  }
  return null;
};

/**
 * Validate national ID format
 */
export const validateNationalId = (id: string): string | null => {
  const idRegex = /^\d{8}$/;
  if (!idRegex.test(id)) {
    return 'National ID must be exactly 8 digits';
  }
  return null;
};

/**
 * Validate GPS coordinates
 */
export const validateCoordinates = (latitude: number, longitude: number): string | null => {
  if (latitude < -90 || latitude > 90) {
    return 'Latitude must be between -90 and 90';
  }
  
  if (longitude < -180 || longitude > 180) {
    return 'Longitude must be between -180 and 180';
  }
  
  return null;
};

/**
 * Validate collection volume
 */
export const validateCollectionVolume = (volume: number): string | null => {
  if (isNaN(volume) || volume <= 0) {
    return 'Volume must be greater than 0';
  }
  
  if (volume > 1000) {
    return 'Volume cannot exceed 1000 liters';
  }
  
  return null;
};

/**
 * Validate collection temperature
 */
export const validateCollectionTemperature = (temperature: number): string | null => {
  if (isNaN(temperature)) {
    return 'Temperature must be a valid number';
  }
  
  if (temperature < 0 || temperature > 50) {
    return 'Temperature must be between 0°C and 50°C';
  }
  
  return null;
};

/**
 * Process Zod validation errors and convert to our format
 */
export const processZodErrors = (zodError: any): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (zodError?.issues) {
    zodError.issues.forEach((issue: any) => {
      errors.push({
        field: issue.path?.join('.') || 'unknown',
        message: issue.message || 'Invalid value'
      });
    });
  }
  
  return errors;
};

/**
 * Get user-friendly error message for form submission
 */
export const getFormSubmissionErrorMessage = (error: any): string => {
  if (error?.response?.status === 422) {
    return 'Please check the form for validation errors';
  }
  
  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again';
  }
  
  if (error?.response?.status >= 500) {
    return 'Server error. Please try again later';
  }
  
  if (error?.message?.includes('Network Error') || error?.code === 'NETWORK_ERROR') {
    return 'Network connection failed. Please check your internet connection';
  }
  
  return error?.message || 'An unexpected error occurred. Please try again';
};

/**
 * Format field name for display
 */
export const formatFieldName = (fieldName: string): string => {
  // Convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};