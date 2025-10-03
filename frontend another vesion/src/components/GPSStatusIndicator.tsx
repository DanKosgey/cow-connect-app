import React from 'react';
import { MapPin, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface GPSStatusIndicatorProps {
  status: 'acquiring' | 'acquired' | 'error' | 'denied' | 'poor' | 'good' | 'excellent';
  accuracy?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  onRefresh?: () => void;
  onRequestPermission?: () => void;
}

const GPSStatusIndicator: React.FC<GPSStatusIndicatorProps> = ({
  status,
  accuracy,
  latitude,
  longitude,
  onRefresh,
  onRequestPermission
}) => {
  const renderStatusContent = () => {
    switch (status) {
      case 'acquiring':
        return (
          <div className="flex items-center text-secondary-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            <span>Acquiring location...</span>
          </div>
        );
      
      case 'denied':
        return (
          <div className="text-error">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 mr-2" />
              <span className="font-medium">Location access denied</span>
            </div>
            <p className="text-xs mt-1">
              Please enable location permissions in your device settings
            </p>
            {onRequestPermission && (
              <button
                onClick={onRequestPermission}
                className="text-xs text-secondary-600 underline mt-1"
              >
                Request Permission
              </button>
            )}
          </div>
        );
      
      case 'error':
        return (
          <div className="text-error">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="font-medium">Location error</span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-xs text-secondary-600 underline mt-1"
              >
                Try Again
              </button>
            )}
          </div>
        );
      
      case 'poor':
      case 'good':
      case 'excellent':
      case 'acquired':
        return (
          <div>
            {latitude !== null && longitude !== null && (
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-1 text-secondary-600" />
                <span>
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
            )}
            
            {accuracy !== null && accuracy !== undefined && (
              <div className="flex items-center mt-1">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  status === 'excellent' ? 'bg-primary-500' : 
                  status === 'good' ? 'bg-warning' : 'bg-error'
                }`}></div>
                <span className="text-xs text-secondary-600">
                  Accuracy: {accuracy.toFixed(0)} meters
                  {status === 'excellent' ? ' (Excellent)' : 
                   status === 'good' ? ' (Good)' : ' (Poor)'}
                </span>
              </div>
            )}
            
            <div className="flex items-center mt-1">
              <CheckCircle className="h-3 w-3 text-primary-500 mr-1" />
              <span className="text-xs text-primary-600">Location captured</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Determine container styling based on status
  const containerClass = 
    status === 'denied' || status === 'error' ? 'bg-error/20 border-error/30' :
    status === 'acquired' || status === 'excellent' ? 'bg-primary-100 border-primary-200' :
    status === 'good' ? 'bg-warning/20 border-warning/30' :
    'bg-secondary-100 border-secondary-200';

  return (
    <div className={`p-3 rounded-lg border ${containerClass}`}>
      {renderStatusContent()}
    </div>
  );
};

export default GPSStatusIndicator;