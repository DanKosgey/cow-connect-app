/**
 * Validated Input Component for DairyChain Pro
 * Form input with real-time validation and accessibility features
 */

import React, { useState, useEffect } from 'react';
import { FormValidator } from '../../utils/validation';

interface ValidatedInputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onValidationChange: (name: string, isValid: boolean, error?: string) => void;
  placeholder?: string;
  required?: boolean;
  validationType?: 'email' | 'phone' | 'nationalId' | 'password' | 'farmSize' | 'location';
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  'aria-describedby'?: string;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  name,
  type,
  value,
  onChange,
  onValidationChange,
  placeholder,
  required = false,
  validationType,
  className = '',
  disabled = false,
  autoComplete,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (touched && value) {
      validateInput();
    }
  }, [value, touched, validationType]);

  const validateInput = () => {
    if (!validationType) return;

    let validationResult;
    
    switch (validationType) {
      case 'email':
        validationResult = FormValidator.validateEmail(value);
        break;
      case 'phone':
        validationResult = FormValidator.validatePhone(value);
        break;
      case 'nationalId':
        validationResult = FormValidator.validateNationalId(value);
        break;
      case 'password':
        validationResult = FormValidator.validatePassword(value);
        break;
      case 'farmSize':
        validationResult = FormValidator.validateFarmSize(value);
        break;
      case 'location':
        validationResult = FormValidator.validateLocation(value);
        break;
      default:
        validationResult = { isValid: true };
    }

    const errorMessage = validationResult.isValid ? '' : validationResult.error || '';
    setError(errorMessage);
    onValidationChange(name, validationResult.isValid, errorMessage);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(name, newValue);
    
    if (touched) {
      validateInput();
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validateInput();
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = touched && error;
  const inputId = `${name}-input`;
  const errorId = `${name}-error`;

  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : ariaDescribedBy}
          aria-required={required}
          className={`
            w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 placeholder-gray-400'
            }
          `}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {hasError && (
        <p 
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default ValidatedInput;