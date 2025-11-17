import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Check initial connection
    const updateConnectionStatus = () => {
      setIsOnline(navigator.onLine);
      
      // Get connection type if available
      if ('connection' in navigator) {
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          setConnectionType(connection.effectiveType || 'unknown');
        }
      }
    };

    // Add event listeners
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    // Initial check
    updateConnectionStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isOffline: !isOnline
  };
};