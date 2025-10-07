import { renderHook, act } from '@testing-library/react';
import { useTabCache } from '../hooks/useTabCache';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useTabCache', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('returns null cached data initially', () => {
    const { result } = renderHook(() => useTabCache({ cacheKey: 'test-key' }));

    expect(result.current.cachedData).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('saves data to cache', () => {
    const { result } = renderHook(() => useTabCache({ cacheKey: 'test-key' }));

    act(() => {
      result.current.saveToCache({ test: 'data' });
    });

    const cached = localStorage.getItem('tab_cache_test-key');
    expect(cached).not.toBeNull();
  });

  it('loads data from cache', () => {
    // Set up cache data
    const cacheData = {
      data: { test: 'data' },
      timestamp: Date.now()
    };
    localStorage.setItem('tab_cache_test-key', JSON.stringify(cacheData));

    const { result } = renderHook(() => useTabCache({ cacheKey: 'test-key' }));

    expect(result.current.cachedData).toEqual({ test: 'data' });
    expect(result.current.loading).toBe(false);
  });

  it('clears cache', () => {
    // Set up cache data
    const cacheData = {
      data: { test: 'data' },
      timestamp: Date.now()
    };
    localStorage.setItem('tab_cache_test-key', JSON.stringify(cacheData));

    const { result } = renderHook(() => useTabCache({ cacheKey: 'test-key' }));

    act(() => {
      result.current.clearCache();
    });

    const cached = localStorage.getItem('tab_cache_test-key');
    expect(cached).toBeNull();
  });

  it('expires cache after ttl', () => {
    // Set up expired cache data
    const cacheData = {
      data: { test: 'data' },
      timestamp: Date.now() - 10 * 60 * 1000 // 10 minutes ago
    };
    localStorage.setItem('tab_cache_test-key', JSON.stringify(cacheData));

    const { result } = renderHook(() => useTabCache({ 
      cacheKey: 'test-key',
      ttl: 5 * 60 * 1000 // 5 minutes
    }));

    expect(result.current.cachedData).toBeNull();
    expect(result.current.loading).toBe(false);

    // Cache should be cleared
    const cached = localStorage.getItem('tab_cache_test-key');
    expect(cached).toBeNull();
  });
});