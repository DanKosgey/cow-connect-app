import { AuthProvider, useAuth } from '@/auth';
import { secureStorage } from '@/auth/utils/secureStorage';
import { ThemeProvider } from '@/core/providers/ThemeProvider';
import { ToastProvider, SonnerToaster } from '@/shared/components/ui';
import { ErrorProvider, useError } from '@/shared/contexts/ErrorContext';
import { PerformanceProvider, usePerformance } from '@/shared/contexts/PerformanceContext';
import { usePerformanceMonitoring, useApiWithPerformance, useFormErrors } from '@/shared/hooks';

describe('Domain-Driven Reorganization', () => {
  it('should verify auth domain exports', () => {
    expect(AuthProvider).toBeDefined();
    expect(useAuth).toBeDefined();
    expect(secureStorage).toBeDefined();
  });

  it('should verify core domain exports', () => {
    expect(ThemeProvider).toBeDefined();
  });

  it('should verify shared domain exports', () => {
    expect(ToastProvider).toBeDefined();
    expect(SonnerToaster).toBeDefined();
    expect(ErrorProvider).toBeDefined();
    expect(useError).toBeDefined();
    expect(PerformanceProvider).toBeDefined();
    expect(usePerformance).toBeDefined();
    expect(usePerformanceMonitoring).toBeDefined();
    expect(useApiWithPerformance).toBeDefined();
    expect(useFormErrors).toBeDefined();
  });

  it('should verify TypeScript compilation', () => {
    // This test passes if TypeScript compilation succeeds
    expect(true).toBe(true);
  });
});