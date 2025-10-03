import { useState, useCallback } from 'react';

interface FieldErrors {
  [key: string]: string;
}

const useFormErrors = () => {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  const setErrorsFromResponse = useCallback((errorResponse: any) => {
    if (errorResponse.details) {
      const newFieldErrors: FieldErrors = {};
      
      if (Array.isArray(errorResponse.details)) {
        // Handle array format
        errorResponse.details.forEach((error: any) => {
          if (error.field && error.error) {
            newFieldErrors[error.field] = error.error;
          }
        });
      } else if (typeof errorResponse.details === 'object') {
        // Handle object format
        Object.keys(errorResponse.details).forEach(key => {
          newFieldErrors[key] = errorResponse.details[key];
        });
      }
      
      setFieldErrors(newFieldErrors);
      
      // Set general error if there are no field-specific errors
      if (Object.keys(newFieldErrors).length === 0 && errorResponse.message) {
        setGeneralError(errorResponse.message);
      }
    } else if (errorResponse.message) {
      setGeneralError(errorResponse.message);
    }
  }, []);

  return {
    fieldErrors,
    generalError,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setErrorsFromResponse,
  };
};

export default useFormErrors;