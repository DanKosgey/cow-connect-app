import { format } from 'date-fns';

const formatDateSafely = (dateString: string): string => {
  if (!dateString) return 'Invalid Date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};

describe('Safe Date Formatting', () => {
  it('should format valid dates correctly', () => {
    expect(formatDateSafely('2025-11-18')).toBe('Nov 18, 2025');
    expect(formatDateSafely('2025-01-01')).toBe('Jan 01, 2025');
    expect(formatDateSafely('2025-12-31')).toBe('Dec 31, 2025');
  });

  it('should handle invalid dates gracefully', () => {
    expect(formatDateSafely('')).toBe('Invalid Date');
    expect(formatDateSafely('invalid-date')).toBe('Invalid Date');
    expect(formatDateSafely('2025-13-45')).toBe('Invalid Date');
    expect(formatDateSafely(null as any)).toBe('Invalid Date');
    expect(formatDateSafely(undefined as any)).toBe('Invalid Date');
  });

  it('should handle edge cases', () => {
    expect(formatDateSafely('0001-01-01')).toBe('Jan 01, 0001');
    expect(formatDateSafely('9999-12-31')).toBe('Dec 31, 9999');
  });
});