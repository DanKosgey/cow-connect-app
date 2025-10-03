/**
 * Location Service for DairyChain Pro
 * Handles geolocation and reverse geocoding for farm locations
 */

interface LocationResult {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private static instance: LocationService;
  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async getCurrentPosition(options?: PositionOptions): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const address = await this.reverseGeocode(latitude, longitude);
            resolve({
              latitude,
              longitude,
              address,
            });
          } catch (error) {
            // Return coordinates even if reverse geocoding fails
            resolve({
              latitude,
              longitude,
            });
          }
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: this.getLocationErrorMessage(error),
          };
          reject(locationError);
        },
        defaultOptions
      );
    });
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Using a free geocoding service (replace with your preferred service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      // Format address from components
      const addressParts = [
        data.locality,
        data.principalSubdivision,
        data.countryName,
      ].filter(Boolean);
      
      return addressParts.join(', ');
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions and try again.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please try again.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown location error occurred.';
    }
  }

  // Validate that coordinates are not the default (0, 0)
  static isValidLocation(latitude: number, longitude: number): boolean {
    return latitude !== 0 || longitude !== 0;
  }

  // Check if location is within Kenya (rough bounds)
  static isInKenya(latitude: number, longitude: number): boolean {
    const kenyaBounds = {
      north: 5.0,
      south: -4.7,
      east: 41.9,
      west: 33.9,
    };
    
    return (
      latitude >= kenyaBounds.south &&
      latitude <= kenyaBounds.north &&
      longitude >= kenyaBounds.west &&
      longitude <= kenyaBounds.east
    );
  }
}

export const locationService = LocationService.getInstance();
export type { LocationResult, LocationError };
export { LocationService };