import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/core/providers/ThemeProvider";
import { router } from "@/core/config/router";
import { logger } from '@/core/utils/logger';
import { useEffect } from 'react';
import ErrorBoundary from '@/shared/components/feedback/ErrorBoundary';
import GlobalErrorBoundary from '@/shared/components/feedback/GlobalErrorBoundary';
import { ErrorProvider } from '@/shared/contexts/ErrorContext';
import ErrorNotificationsContainer from '@/shared/components/feedback/ErrorNotificationsContainer';
import { PerformanceProvider } from '@/shared/contexts/PerformanceContext';
import usePerformanceMonitoring from '@/shared/hooks/usePerformanceMonitoring';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    logger.debug('App component mounted');
    return () => {
      logger.debug('App component unmounted');
    };
  }, []);

  // Initialize performance monitoring
  usePerformanceMonitoring();

  logger.time('App Render');
  const result = (
    <ErrorProvider>
      <GlobalErrorBoundary>
        <PerformanceProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ErrorNotificationsContainer />
                <RouterProvider router={router} />
              </TooltipProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </PerformanceProvider>
      </GlobalErrorBoundary>
    </ErrorProvider>
  );
  logger.timeEnd('App Render');
  return result;
}

export default App;