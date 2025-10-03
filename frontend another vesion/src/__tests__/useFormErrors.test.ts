import { renderHook, act } from '@testing-library/react';
import useFormErrors from '@/hooks/useFormErrors';

describe('useFormErrors', () => {
  it('should initialize with empty errors', () => {
    const { result } = renderHook(() => useFormErrors());
    
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.generalError).toBeNull();
  });

  it('should set field error', () => {
    const { result } = renderHook(() => useFormErrors());
    
    act(() => {
      result.current.setFieldError('email', 'Invalid email format');
    });
    
    expect(result.current.fieldErrors).toEqual({
      email: 'Invalid email format'
    });
  });

  it('should clear field error', () => {
    const { result } = renderHook(() => useFormErrors());
    
    act(() => {
      result.current.setFieldError('email', 'Invalid email format');
      result.current.setFieldError('password', 'Password too short');
    });
    
    expect(result.current.fieldErrors).toEqual({
      email: 'Invalid email format',
      password: 'Password too short'
    });
    
    act(() => {
      result.current.clearFieldError('email');
    });
    
    expect(result.current.fieldErrors).toEqual({
      password: 'Password too short'
    });
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useFormErrors());
    
    act(() => {
      result.current.setFieldError('email', 'Invalid email format');
      result.current.setGeneralError('Form submission failed');
    });
    
    expect(result.current.fieldErrors).toEqual({
      email: 'Invalid email format'
    });
    expect(result.current.generalError).toBe('Form submission failed');
    
    act(() => {
      result.current.clearAllErrors();
    });
    
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.generalError).toBeNull();
  });

  it('should set errors from response with array format', () => {
    const { result } = renderHook(() => useFormErrors());
    
    const errorResponse = {
      details: [
        { field: 'email', error: 'Invalid email format' },
        { field: 'password', error: 'Password too short' }
      ]
    };
    
    act(() => {
      result.current.setErrorsFromResponse(errorResponse);
    });
    
    expect(result.current.fieldErrors).toEqual({
      email: 'Invalid email format',
      password: 'Password too short'
    });
    expect(result.current.generalError).toBeNull();
  });

  it('should set errors from response with object format', () => {
    const { result } = renderHook(() => useFormErrors());
    
    const errorResponse = {
      details: {
        email: 'Invalid email format',
        password: 'Password too short'
      }
    };
    
    act(() => {
      result.current.setErrorsFromResponse(errorResponse);
    });
    
    expect(result.current.fieldErrors).toEqual({
      email: 'Invalid email format',
      password: 'Password too short'
    });
    expect(result.current.generalError).toBeNull();
  });

  it('should set general error when no field details provided', () => {
    const { result } = renderHook(() => useFormErrors());
    
    const errorResponse = {
      message: 'Form submission failed'
    };
    
    act(() => {
      result.current.setErrorsFromResponse(errorResponse);
    });
    
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.generalError).toBe('Form submission failed');
  });

  it('should set general error when details is empty', () => {
    const { result } = renderHook(() => useFormErrors());
    
    const errorResponse = {
      message: 'Form submission failed',
      details: {}
    };
    
    act(() => {
      result.current.setErrorsFromResponse(errorResponse);
    });
    
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.generalError).toBe('Form submission failed');
  });
});