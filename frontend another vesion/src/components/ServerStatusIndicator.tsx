import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, WifiOff, Wifi } from 'lucide-react';
import { connectivityChecker } from '@/utils/connectivityChecker';

interface ServerStatusIndicatorProps {
  className?: string;
}

const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({ className = '' }) => {
  const [isServerDown, setIsServerDown] = useState(connectivityChecker.isServerConsideredDown());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Listen for connectivity changes
    const handleConnectivityChange = (isDown: boolean) => {
      setIsServerDown(isDown);
    };

    connectivityChecker.addListener(handleConnectivityChange);

    // Cleanup listener on unmount
    return () => {
      connectivityChecker.removeListener(handleConnectivityChange);
    };
  }, []);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await connectivityChecker.forceCheck();
      setIsServerDown(connectivityChecker.isServerConsideredDown());
    } catch (error) {
      console.error('Manual check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!isServerDown) {
    return (
      <div className={`bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative ${className}`} role="alert">
        <div className="flex items-center">
          <Wifi className="h-5 w-5 mr-2" />
          <strong className="font-bold">Server Connected</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative ${className}`} role="alert">
      <div className="flex items-center">
        <WifiOff className="h-5 w-5 mr-2" />
        <strong className="font-bold">Server Unavailable</strong>
      </div>
      <div className="mt-2 text-sm">
        <p>We're having trouble connecting to the server. Some features may be unavailable.</p>
        <button 
          onClick={handleManualCheck}
          disabled={checking}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Retry Connection'}
        </button>
      </div>
    </div>
  );
};

export default ServerStatusIndicator;