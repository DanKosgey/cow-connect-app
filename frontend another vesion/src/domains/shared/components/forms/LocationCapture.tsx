/**
 * Location Capture Component for DairyChain Pro
 * Allows farmers to capture their farm location with geolocation
 */

import React, { useState } from 'react';
import { locationService, LocationResult, LocationError, LocationService } from '../../utils/locationService';

interface LocationCaptureProps {
  onLocationUpdate: (location: LocationResult) => void;
  onError: (error: string) => void;
  className?: string;
}

const LocationCapture: React.FC<LocationCaptureProps> = ({
  onLocationUpdate,
  onError,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationResult | null>(null);

  const captureLocation = async () => {
    setLoading(true);
    
    try {
      const result = await locationService.getCurrentPosition();
      
      // Validate location
      if (!LocationService.isValidLocation(result.latitude, result.longitude)) {
        onError('Invalid location coordinates. Please try again.');
        return;
      }
      
      if (!LocationService.isInKenya(result.latitude, result.longitude)) {
        onError('Location appears to be outside Kenya. Please verify your location.');
        return;
      }
      
      setLocation(result);
      onLocationUpdate(result);
    } catch (error) {
      const err = error as LocationError;
      onError(err.message || 'Failed to capture location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Farm Location</h3>
          {location ? (
            <div className="mt-1 text-sm text-gray-600">
              <p>📍 {location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}</p>
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Click the button to capture your current location
            </p>
          )}
        </div>
        
        <button
          type="button"
          onClick={captureLocation}
          disabled={loading}
          className={`
            ml-4 px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
            }
          `}
          aria-label={loading ? 'Capturing location...' : 'Capture current location'}
        >
          {loading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Locating...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location ? 'Update Location' : 'Get Location'}
            </div>
          )}
        </button>
      </div>
      
      {location && (
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
          <p className="font-medium text-blue-900">Location Privacy Notice:</p>
          <p>Your location is only used to verify your farm's location and improve our services. We do not share your precise location with third parties.</p>
        </div>
      )}
    </div>
  );
};

export default LocationCapture;