/**
 * Validation utilities for DairyChain Pro
 */

// Generate a unique validation code for collections
export const generateValidationCode = (): string => {
  // Format: MC + YYYY + day of year + random 4 digits
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Generate 4 random digits
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  
  return `MC${year}${dayOfYear.toString().padStart(3, '0')}${randomDigits}`;
};

// Validate quantity input (positive numbers only)
export const validateQuantity = (quantity: string): boolean => {
  const num = parseFloat(quantity);
  return !isNaN(num) && num > 0 && num <= 1000; // Reasonable limit of 1000 liters
};

// Validate GPS coordinates
export const validateCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

// Check for duplicate collection (same farmer, same day)
export const isDuplicateCollection = async (
  farmerId: string,
  collectionDate: string,
  apiService: any
): Promise<boolean> => {
  try {
    // Fetch today's collections for this farmer
    const response = await apiService.Collections.list(100, 0, farmerId);
    const collections = response.items || [];
    
    // Check if any collection was made today
    const today = new Date().toISOString().split('T')[0];
    return collections.some((collection: any) => 
      collection.timestamp.startsWith(today)
    );
  } catch (error) {
    console.error('Error checking for duplicate collection:', error);
    // In case of error, we'll allow the collection to proceed to avoid blocking staff
    return false;
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class FormValidator {
  private static kenyanPhoneRegex = /^(\+?254|0)?([17]\d{8})$/;
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static nationalIdRegex = /^\d{8}$/;

  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    if (!phone.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    if (!this.kenyanPhoneRegex.test(phone.replace(/\s+/g, ''))) {
      return { 
        isValid: false, 
        error: 'Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)' 
      };
    }
    
    return { isValid: true };
  }

  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email.trim()) {
      return { isValid: false, error: 'Email is required' };
    }
    
    if (!this.emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { isValid: true };
  }

  static validateNationalId(id: string): { isValid: boolean; error?: string } {
    if (!id.trim()) {
      return { isValid: false, error: 'National ID is required' };
    }
    
    if (!this.nationalIdRegex.test(id)) {
      return { isValid: false, error: 'National ID must be exactly 8 digits' };
    }
    
    return { isValid: true };
  }

  static validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        error: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' 
      };
    }
    
    return { isValid: true };
  }

  static validateFarmSize(size: string): { isValid: boolean; error?: string } {
    const numSize = parseFloat(size);
    
    if (isNaN(numSize)) {
      return { isValid: false, error: 'Farm size must be a valid number' };
    }
    
    if (numSize <= 0) {
      return { isValid: false, error: 'Farm size must be greater than 0' };
    }
    
    if (numSize > 10000) {
      return { isValid: false, error: 'Farm size seems too large. Please verify.' };
    }
    
    return { isValid: true };
  }

  static validateLocation(location: string): { isValid: boolean; error?: string } {
    if (!location.trim()) {
      return { isValid: false, error: 'Location is required' };
    }
    
    if (location.trim().length < 3) {
      return { isValid: false, error: 'Please enter a more specific location' };
    }
    
    return { isValid: true };
  }

  static validateRegistrationForm(formData: any): ValidationResult {
    const errors: Record<string, string> = {};
    
    // Personal Information
    if (!formData.name?.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    const emailValidation = this.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }

    const phoneValidation = this.validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error!;
    }

    const idValidation = this.validateNationalId(formData.national_id);
    if (!idValidation.isValid) {
      errors.national_id = idValidation.error!;
    }

    const passwordValidation = this.validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error!;
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Farm Information
    const farmSizeValidation = this.validateFarmSize(formData.farm_size);
    if (!farmSizeValidation.isValid) {
      errors.farm_size = farmSizeValidation.error!;
    }

    const locationValidation = this.validateLocation(formData.location);
    if (!locationValidation.isValid) {
      errors.location = locationValidation.error!;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}