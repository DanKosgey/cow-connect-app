import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorNotification {
  id: string;
  message: string;
  type: ErrorType;
  timestamp: Date;
}

interface ErrorContextType {
  errors: ErrorNotification[];
  addError: (message: string, type?: ErrorType) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorNotification[]>([]);

  const addError = useCallback((message: string, type: ErrorType = 'error') => {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newError: ErrorNotification = {
      id,
      message,
      type,
      timestamp: new Date(),
    };

    setErrors(prev => [...prev, newError]);

    // Auto-remove error after 5 seconds for non-error types
    if (type !== 'error') {
      setTimeout(() => {
        setErrors(prev => prev.filter(error => error.id !== id));
      }, 5000);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};