import { useState, useEffect } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

export const useMobileOptimizations = (): MobileOptimizations => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenWidth(width);
      setScreenHeight(height);
      
      // Check if it's a mobile device
      const mobile = width <= 768;
      setIsMobile(mobile);
      
      // Check if it's a tablet
      const tablet = width > 768 && width <= 1024;
      setIsTablet(tablet);
      
      // Check if it's a touch device
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(touch);
    };

    // Initial check
    checkDevice();

    // Add event listener for resize
    window.addEventListener('resize', checkDevice);
    
    // Add event listener for orientation change
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isTouchDevice,
    screenWidth,
    screenHeight
  };
};

export const usePreventZoom = () => {
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const disablePinchZoom = () => {
      document.addEventListener('touchmove', preventZoom, { passive: false });
    };

    const enablePinchZoom = () => {
      document.removeEventListener('touchmove', preventZoom);
    };

    // Only apply to mobile devices
    if ('ontouchstart' in window) {
      disablePinchZoom();
    }

    return () => {
      if ('ontouchstart' in window) {
        enablePinchZoom();
      }
    };
  }, []);
};

export const useMobileKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard opens, the viewport height changes significantly
      const viewportHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      
      // If viewport height is significantly less than screen height, keyboard is likely open
      const keyboardThreshold = 150; // pixels
      const isKeyboardVisible = screenHeight - viewportHeight > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboardVisible);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isKeyboardOpen };
};