import { describe, it, expect } from 'vitest';
import { 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  getDashboardPath, 
  getRoleDisplayName 
} from '@/utils/auth-helpers';

describe('Auth Helpers', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate password length', () => {
      const shortPassword = '123';
      const result = validatePassword(shortPassword);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 6 characters');
      
      const validPassword = 'password123';
      const validResult = validatePassword(validPassword);
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('should return true for valid phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(validatePhone('invalid')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('getDashboardPath', () => {
    it('should return correct dashboard paths for roles', () => {
      expect(getDashboardPath('admin')).toBe('/admin/dashboard');
      expect(getDashboardPath('farmer')).toBe('/farmer/dashboard');
      expect(getDashboardPath('collector')).toBe('/collector/dashboard');
      expect(getDashboardPath('unknown')).toBe('/');
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display names for roles', () => {
      expect(getRoleDisplayName('admin')).toBe('Administrator');
      expect(getRoleDisplayName('farmer')).toBe('Farmer');
      expect(getRoleDisplayName('collector')).toBe('Field Collector');
      expect(getRoleDisplayName('unknown')).toBe('unknown');
    });
  });
});