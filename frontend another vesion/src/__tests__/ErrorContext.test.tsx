import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ErrorProvider, useError } from '@/contexts/ErrorContext';

describe('ErrorContext', () => {
  it('should provide error context', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ErrorProvider>{children}</ErrorProvider>
    );

    const { result } = renderHook(() => useError(), { wrapper });

    expect(result.current.errors).toEqual([]);
    expect(typeof result.current.addError).toBe('function');
    expect(typeof result.current.removeError).toBe('function');
    expect(typeof result.current.clearErrors).toBe('function');
  });

  it('should add errors', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ErrorProvider>{children}</ErrorProvider>
    );

    const { result } = renderHook(() => useError(), { wrapper });

    act(() => {
      result.current.addError('Test error message', 'error');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Test error message');
    expect(result.current.errors[0].type).toBe('error');
  });

  it('should remove errors', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ErrorProvider>{children}</ErrorProvider>
    );

    const { result } = renderHook(() => useError(), { wrapper });

    act(() => {
      result.current.addError('Test error 1', 'error');
      result.current.addError('Test error 2', 'warning');
    });

    expect(result.current.errors).toHaveLength(2);

    const firstErrorId = result.current.errors[0].id;

    act(() => {
      result.current.removeError(firstErrorId);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Test error 2');
  });

  it('should clear all errors', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ErrorProvider>{children}</ErrorProvider>
    );

    const { result } = renderHook(() => useError(), { wrapper });

    act(() => {
      result.current.addError('Test error 1', 'error');
      result.current.addError('Test error 2', 'warning');
    });

    expect(result.current.errors).toHaveLength(2);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toHaveLength(0);
  });
});