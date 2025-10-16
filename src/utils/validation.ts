import { z } from 'zod';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+254[1-9]\d{8}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const validateEmail = (email: string) => {
  try {
    z.string().email().parse(email);
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: 'Invalid email' };
  }
};

export const validatePassword = (formData: { password: string; confirmPassword: string }) => {
  if (!formData.password || formData.password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!PASSWORD_REGEX.test(formData.password)) {
    return {
      isValid: false,
      error: 'Password must include uppercase, lowercase, number, and special character'
    };
  }

  if (formData.password !== formData.confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};