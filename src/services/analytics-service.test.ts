import { describe, it, expect } from 'vitest';
import { analyticsService } from './analytics-service';

describe('AnalyticsService', () => {
  it('should have a fetchDashboardData method', () => {
    // This is a simple test to check if the service is properly exported
    expect(analyticsService).toBeDefined();
    expect(typeof analyticsService.fetchDashboardData).toBe('function');
  });
});
