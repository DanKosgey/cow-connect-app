import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export const useLoading = (initialState: boolean = false) => {
  const [loading, setLoading] = useState<LoadingState>({ 
    isLoading: initialState,
    message: undefined
  });

  const startLoading = useCallback((message?: string) => {
    setLoading({ 
      isLoading: true, 
      message 
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoading({ 
      isLoading: false,
      message: undefined
    });
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    setLoading(prev => ({ 
      ...prev, 
      message 
    }));
  }, []);

  return {
    ...loading,
    startLoading,
    stopLoading,
    setLoadingMessage
  };
};

export default useLoading;