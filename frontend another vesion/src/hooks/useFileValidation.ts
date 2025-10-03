import { useCallback } from 'react';

interface FileValidationOptions {
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

const useFileValidation = (options: FileValidationOptions = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;

  const validateFile = useCallback((file: File): FileValidationResult => {
    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
      };
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file format. Accepted formats: ${acceptedTypes.join(', ')}`
      };
    }

    return {
      isValid: true
    };
  }, [maxSize, acceptedTypes]);

  return {
    validateFile,
    maxSize,
    acceptedTypes
  };
};

export default useFileValidation;