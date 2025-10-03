import { useState, useEffect, useCallback } from 'react';

interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
}

interface GeolocationError {
  code: number;
  message: string;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const useGeolocation = (options: GeolocationOptions = {}) => {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // Default options with high accuracy for dairy collection
  const defaultOptions: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 15000, // 15 seconds for better accuracy
    maximumAge: 60000 // 1 minute
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Check geolocation permission status
  const checkPermissionStatus = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionState(permission.state);
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissionState(permission.state);
        };
      } catch (err) {
        console.warn('Could not check geolocation permission status:', err);
      }
    }
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser.'
      });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
        setLoading(false);
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message
        });
        setLoading(false);
      },
      mergedOptions
    );
  }, [mergedOptions]);

  // Watch position for continuous updates (useful during collection process)
  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser.'
      });
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message
        });
      },
      mergedOptions
    );

    return watchId;
  }, [mergedOptions]);

  // Clear watch
  const clearWatch = useCallback((watchId: number | null) => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    // Check permission status on mount
    checkPermissionStatus();
    
    // Get location on initial load
    getLocation();
  }, [getLocation, checkPermissionStatus]);

  return { 
    location, 
    error, 
    loading, 
    getLocation, 
    watchPosition, 
    clearWatch, 
    permissionState 
  };
};

export default useGeolocation;