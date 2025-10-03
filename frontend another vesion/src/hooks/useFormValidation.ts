import { useState, useCallback } from 'react';
import { ValidationError, ValidationResult } from '@/utils/formValidationUtils';
import useFormErrors from './useFormErrors';

interface UseFormValidationProps {
  onSubmit: (data: any) => Promise<any>;
  onError?: (errors: ValidationError[]) => void;
  onSuccess?: (data: any) => void;
}

const useFormValidation = <T extends Record<string, any>>({
  onSubmit,
  onError,
  onSuccess
}: UseFormValidationProps) => {
  const {
    fieldErrors,
    generalError,
    isSubmitting,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setErrorsFromResponse,
    startSubmitting,
    stopSubmitting,
    setSubmissionError,
  } = useFormErrors();

  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((
    fieldName: keyof T,
    value: any,
    validator: (value: any) => string | null
  ) => {
    const error = validator(value);
    if (error) {
      setFieldError(fieldName as string, error);
      return false;
    } else {
      clearFieldError(fieldName as string);
      return true;
    }
  }, [setFieldError, clearFieldError]);

  const validateForm = useCallback((
    data: T,
    validators: Record<keyof T, (value: any) => string | null>
  ): ValidationResult => {
    const errors: ValidationError[] = [];
    let isValid = true;

    Object.keys(validators).forEach(fieldName => {
      const validator = validators[fieldName as keyof T];
      const value = data[fieldName as keyof T];
      const error = validator(value);
      
      if (error) {
        errors.push({
          field: fieldName,
          message: error
        });
        isValid = false;
      }
    });

    return {
      isValid,
      errors,
    };
  }, []);

  const handleSubmit = useCallback(async (data: T) => {
    startSubmitting();
    
    try {
      const result = await onSubmit(data);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      // Handle different types of errors
      if (error?.response?.status === 422) {
        // Validation errors
        setErrorsFromResponse(error.response.data);
      } else if (error?.name === 'ZodError') {
        // Zod validation errors
        const zodErrors = error.issues.map((issue: any) => ({
          field: issue.path?.join('.') || 'unknown',
          message: issue.message
        }));
        
        zodErrors.forEach((err: ValidationError) => {
          setFieldError(err.field, err.message);
        });
        
        if (onError) {
          onError(zodErrors);
        }
      } else {
        // General error
        const errorMessage = error?.response?.data?.message || 
                            error?.message || 
                            'An unexpected error occurred. Please try again.';
        setSubmissionError(errorMessage);
      }
      
      return null;
    } finally {
      stopSubmitting();
    }
  }, [onSubmit, onError, onSuccess, startSubmitting, stopSubmitting, setErrorsFromResponse, setFieldError, setSubmissionError]);

  const resetForm = useCallback(() => {
    clearAllErrors();
  }, [clearAllErrors]);

  return {
    // State
    fieldErrors,
    generalError,
    isSubmitting,
    isValidating,
    
    // Actions
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
    clearFieldError,
    
    // Helpers
    setFieldError,
    setSubmissionError,
  };
};

export default useFormValidation;