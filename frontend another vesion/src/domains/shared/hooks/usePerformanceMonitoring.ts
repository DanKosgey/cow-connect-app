import { useEffect } from 'react';
import PerformanceMonitoringService from '@/services/PerformanceMonitoringService';

const usePerformanceMonitoring = () => {
  useEffect(() => {
    const performanceService = PerformanceMonitoringService.getInstance();
    performanceService.initialize();
    
    // Check performance budgets periodically
    const budgetInterval = setInterval(() => {
      performanceService.checkPerformanceBudgets();
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(budgetInterval);
    };
  }, []);
};

export default usePerformanceMonitoring;