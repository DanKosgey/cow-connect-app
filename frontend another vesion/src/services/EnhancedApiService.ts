import { usePerformance } from '@/contexts/PerformanceContext';

// Enhanced fetch function with performance tracking
export const fetchWithPerformance = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const startTime = performance.now();
  
  try {
    const response = await fetch(input, init);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Extract API name from the URL
    let apiName = 'unknown';
    if (typeof input === 'string') {
      apiName = input;
    } else if (input instanceof URL) {
      apiName = input.pathname;
    } else if ('url' in input) {
      apiName = (input as Request).url;
    }
    
    // Track performance (in a real app, you'd use the performance context)
    console.debug(`API Call: ${apiName} took ${duration.toFixed(2)}ms`);
    
    // In a real implementation, you would use the performance context:
    // const { trackApiPerformance } = usePerformance();
    // trackApiPerformance(apiName, duration, response.status);
    
    return response;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Extract API name from the URL
    let apiName = 'unknown';
    if (typeof input === 'string') {
      apiName = input;
    } else if (input instanceof URL) {
      apiName = input.pathname;
    } else if ('url' in input) {
      apiName = (input as Request).url;
    }
    
    console.error(`API Call Failed: ${apiName} took ${duration.toFixed(2)}ms`, error);
    
    throw error;
  }
};

// Wrapper for common API methods with performance tracking
export class EnhancedApiService {
  static async get<T>(url: string, options?: RequestInit): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Track performance
      console.debug(`GET ${url} took ${duration.toFixed(2)}ms`);
      
      return data;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`GET ${url} failed after ${duration.toFixed(2)}ms`, error);
      
      throw error;
    }
  }
  
  static async post<T>(url: string, body: any, options?: RequestInit): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Track performance
      console.debug(`POST ${url} took ${duration.toFixed(2)}ms`);
      
      return data;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`POST ${url} failed after ${duration.toFixed(2)}ms`, error);
      
      throw error;
    }
  }
  
  static async put<T>(url: string, body: any, options?: RequestInit): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Track performance
      console.debug(`PUT ${url} took ${duration.toFixed(2)}ms`);
      
      return data;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`PUT ${url} failed after ${duration.toFixed(2)}ms`, error);
      
      throw error;
    }
  }
  
  static async delete<T>(url: string, options?: RequestInit): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Track performance
      console.debug(`DELETE ${url} took ${duration.toFixed(2)}ms`);
      
      return data;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`DELETE ${url} failed after ${duration.toFixed(2)}ms`, error);
      
      throw error;
    }
  }
}