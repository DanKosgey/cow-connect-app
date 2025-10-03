/**
 * GPS Validation Utilities
 * 
 * Utility functions for working with GPS coordinates in the dairy collection system.
 */

/**
 * Generate a validation code that includes GPS coordinates for additional verification
 * @param latitude - GPS latitude coordinate
 * @param longitude - GPS longitude coordinate
 * @param timestamp - Collection timestamp
 * @returns Validation code string
 */
export const generateGPSValidationCode = (
  latitude: number, 
  longitude: number, 
  timestamp: number = Date.now()
): string => {
  // Extract significant digits from coordinates
  const latDigits = Math.abs(latitude).toString().replace('.', '').substring(0, 6);
  const lonDigits = Math.abs(longitude).toString().replace('.', '').substring(0, 6);
  
  // Get timestamp components
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  
  // Generate validation code: GPS + TIMESTAMP + CHECKSUM
  const baseCode = `GPS${latDigits}${lonDigits}${day}${hour}${minute}`;
  const checksum = generateChecksum(baseCode);
  
  return `${baseCode}${checksum}`;
};

/**
 * Generate a simple checksum for validation codes
 * @param input - Input string to generate checksum for
 * @returns Single digit checksum
 */
const generateChecksum = (input: string): number => {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return sum % 10;
};

/**
 * Validate GPS coordinates format and ranges
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Boolean indicating if coordinates are valid
 */
export const validateCoordinates = (latitude: number, longitude: number): boolean => {
  // Latitude must be between -90 and 90
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  
  // Longitude must be between -180 and 180
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  
  return true;
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Format GPS coordinates for display
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param accuracy - Accuracy in meters (optional)
 * @returns Formatted coordinate string
 */
export const formatCoordinates = (
  latitude: number, 
  longitude: number, 
  accuracy?: number | null
): string => {
  let result = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  
  if (accuracy !== undefined && accuracy !== null) {
    result += ` (±${accuracy.toFixed(0)}m)`;
  }
  
  return result;
};

/**
 * Determine coordinate accuracy level
 * @param accuracy - Accuracy in meters
 * @returns Accuracy level description
 */
export const getAccuracyLevel = (accuracy: number): 'excellent' | 'good' | 'poor' => {
  if (accuracy < 5) return 'excellent';
  if (accuracy < 15) return 'good';
  return 'poor';
};

export default {
  generateGPSValidationCode,
  validateCoordinates,
  calculateDistance,
  formatCoordinates,
  getAccuracyLevel
};