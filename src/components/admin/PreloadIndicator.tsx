import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PreloadIndicatorProps {
  targetPath: string;
  message?: string;
}

export const PreloadIndicator: React.FC<PreloadIndicatorProps> = ({ 
  targetPath, 
  message = 'Preparing content for faster loading...' 
}) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show indicator when approaching the target path
    if (location.pathname.includes(targetPath.replace('/admin/', '')) || 
        location.pathname === '/admin' || 
        location.pathname === '/admin/') {
      // Small delay to allow for natural navigation
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      // Hide after a short time
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [location.pathname, targetPath]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};