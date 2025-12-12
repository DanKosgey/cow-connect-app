// Authentication helper functions

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long'
    };
  }
  
  // Add more validation rules as needed
  return {
    isValid: true,
    message: 'Password is valid'
  };
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  // Simple validation - adjust based on your requirements
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

/**
 * Get redirect path based on user role
 */
export const getDashboardPath = (role: string): string => {
  const paths: Record<string, string> = {
    'admin': '/admin/dashboard',
    'collector': '/collector/dashboard',
    'staff': '/staff/dashboard',
    'farmer': '/farmer/dashboard',
    'creditor': '/creditor/dashboard'
  };
  
  return paths[role] || '/';
};

/**
 * Check if user has required permissions
 */
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    'admin': 'Administrator',
    'collector': 'Field Collector',
    'staff': 'Office Staff',
    'farmer': 'Farmer',
    'creditor': 'Agrovet Creditor'
  };
  
  return roleNames[role] || role;
};