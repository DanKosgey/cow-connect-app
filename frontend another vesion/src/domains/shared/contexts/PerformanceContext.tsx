import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PerformanceMonitoringService from '@/services/PerformanceMonitoringService';

interface PerformanceMetrics {
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
}

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  updateMetric: (name: string, value: number) => void;
  trackApiPerformance: (apiName: string, duration: number, statusCode: number) => void;
  checkPerformanceBudgets: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const performanceService = PerformanceMonitoringService.getInstance();

  const updateMetric = useCallback((name: string, value: number) => {
    setMetrics(prev => ({ ...prev, [name]: value }));
  }, []);

  const trackApiPerformance = useCallback((apiName: string, duration: number, statusCode: number) => {
    performanceService.trackApiPerformance(apiName, duration, statusCode);
  }, [performanceService]);

  const checkPerformanceBudgets = useCallback(() => {
    performanceService.checkPerformanceBudgets();
  }, [performanceService]);

  useEffect(() => {
    performanceService.initialize();
    
    // Set up periodic budget checking
    const interval = setInterval(() => {
      checkPerformanceBudgets();
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [performanceService, checkPerformanceBudgets]);

  const value: PerformanceContextType = {
    metrics,
    updateMetric,
    trackApiPerformance,
    checkPerformanceBudgets
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};