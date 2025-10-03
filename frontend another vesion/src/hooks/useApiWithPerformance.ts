import { useCallback } from 'react';
import { usePerformance } from '@/contexts/PerformanceContext';

interface ApiCallOptions extends RequestInit {
  skipPerformanceTracking?: boolean;
}

const useApiWithPerformance = () => {
  const { trackApiPerformance } = usePerformance();

  const fetchWithPerformance = useCallback(async (
    url: string,
    options: ApiCallOptions = {}
  ): Promise<Response> => {
    const { skipPerformanceTracking, ...fetchOptions } = options;
    const startTime = performance.now();

    try {
      const response = await fetch(url, fetchOptions);
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!skipPerformanceTracking) {
        trackApiPerformance(url, duration, response.status);
      }

      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!skipPerformanceTracking) {
        // Track failed API calls as well
        trackApiPerformance(url, duration, 0); // 0 status code for errors
      }

      throw error;
    }
  }, [trackApiPerformance]);

  const get = useCallback(async <T,>(
    url: string,
    options?: ApiCallOptions
  ): Promise<T> => {
    const response = await fetchWithPerformance(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [fetchWithPerformance]);

  const post = useCallback(async <T,>(
    url: string,
    body: any,
    options?: ApiCallOptions
  ): Promise<T> => {
    const response = await fetchWithPerformance(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [fetchWithPerformance]);

  const put = useCallback(async <T,>(
    url: string,
    body: any,
    options?: ApiCallOptions
  ): Promise<T> => {
    const response = await fetchWithPerformance(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [fetchWithPerformance]);

  const del = useCallback(async <T,>(
    url: string,
    options?: ApiCallOptions
  ): Promise<T> => {
    const response = await fetchWithPerformance(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [fetchWithPerformance]);

  return { get, post, put, delete: del, fetchWithPerformance };
};

export default useApiWithPerformance;