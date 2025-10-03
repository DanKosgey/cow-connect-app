# Form Validation Implementation

This document describes the comprehensive form validation implementation in the DairyChain Pro application.

## Overview

The form validation system provides a robust and user-friendly way to handle form validation and error display. It includes:

1. **Custom Validation Hooks** - Flexible validation logic
2. **Error Handling Utilities** - Consistent error management
3. **User-Friendly Error Messages** - Clear feedback for users
4. **Integration with Existing Libraries** - Works with Zod and react-hook-form

## Core Components

### useFormErrors Hook

A lightweight hook for managing form errors:

```typescript
import useFormErrors from '@/hooks/useFormErrors';

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
```

### useFormValidation Hook

A comprehensive hook that combines validation logic with error handling:

```typescript
import useFormValidation from '@/hooks/useFormValidation';

const formValidation = useFormValidation({
  onSubmit: async (data) => {
    // Submit logic
    return await apiCall(data);
  },
  onSuccess: (result) => {
    // Handle success
  },
  onError: (errors) => {
    // Handle validation errors
  }
});
```

### Form Validation Utilities

A collection of utility functions for common validation scenarios:

```typescript
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateNumber,
  validateStringLength,
  validatePassword,
  validateMatch,
  validateNationalId,
  validateCoordinates,
  validateCollectionVolume,
  validateCollectionTemperature,
  processZodErrors,
  getFormSubmissionErrorMessage,
  formatFieldName
} from '@/utils/formValidationUtils';
```

## Implementation Examples

### Basic Form Validation

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, UserFormData } from '@/utils/userValidation';
import useFormValidation from '@/hooks/useFormValidation';

const UserForm = () => {
  const formValidation = useFormValidation({
    onSubmit: async (data: UserFormData) => {
      return await apiService.Users.create(data);
    },
    onSuccess: (result) => {
      console.log('User created:', result);
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    await formValidation.handleSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          {...register('email')}
          className={formValidation.fieldErrors.email ? 'error' : ''}
        />
        {formValidation.fieldErrors.email && (
          <p className="error-message">{formValidation.fieldErrors.email}</p>
        )}
      </div>
      
      {formValidation.generalError && (
        <div className="general-error">
          {formValidation.generalError}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={formValidation.isSubmitting}
      >
        {formValidation.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

### Custom Field Validation

```typescript
const validateCustomField = (value: string) => {
  if (value.length < 5) {
    return 'Field must be at least 5 characters long';
  }
  return null;
};

const isValid = formValidation.validateField('customField', value, validateCustomField);
```

### Form-Level Validation

```typescript
const validators = {
  email: validateEmail,
  phone: validatePhone,
  password: validatePassword,
};

const result = formValidation.validateForm(formData, validators);

if (!result.isValid) {
  result.errors.forEach(error => {
    formValidation.setFieldError(error.field, error.message);
  });
}
```

## Error Handling

### API Error Processing

The system automatically processes API validation errors:

```typescript
// For 422 Unprocessable Entity responses
{
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "error": "Please enter a valid email address"
    }
  ]
}

// Or object format
{
  "message": "Validation failed",
  "details": {
    "email": "Please enter a valid email address",
    "phone": "Please enter a valid phone number"
  }
}
```

### Zod Error Processing

The system also handles Zod validation errors:

```typescript
const zodErrors = processZodErrors(zodError);
zodErrors.forEach(error => {
  formValidation.setFieldError(error.field, error.message);
});
```

## Best Practices

1. **Consistent Error Display** - Always show errors near the relevant field
2. **Clear Error Messages** - Use user-friendly language
3. **Immediate Feedback** - Validate fields on blur or change when appropriate
4. **Accessibility** - Use proper ARIA attributes for error messages
5. **Loading States** - Show visual feedback during submission
6. **Error Recovery** - Allow users to easily correct errors

## Accessibility

The form validation system follows accessibility best practices:

- Error messages are associated with fields using `aria-describedby`
- Fields are marked as invalid using `aria-invalid`
- Error containers have `role="alert"` for immediate announcement
- Focus management for error recovery

## Testing

The validation system has been tested with:

- Valid form submissions
- Invalid form submissions
- API validation errors
- Network errors
- Zod validation errors
- Edge cases (empty values, special characters, etc.)

## Future Improvements

1. **Async Validation** - Support for async validation rules
2. **Cross-Field Validation** - Validation that depends on multiple fields
3. **Validation Schema Builder** - Utility for building complex validation schemas
4. **Internationalization** - Support for multiple languages in error messages
5. **Performance Optimization** - Memoization of validation results