import { secureRequest } from '../utils/csrf';
import { cacheService } from '../utils/cacheService';

interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

interface RequestConfig {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
}

class OptimizedApiService {
  private baseURL = '/api/v1';
  private defaultTimeout = 10000;

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      cache = false,
      cacheTTL = 300000, // 5 minutes
      retries = 3,
      timeout = this.defaultTimeout,
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${url}_${JSON.stringify(options)}`;

    // Check cache for GET requests
    if (cache && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      if (cacheService.has(cacheKey)) {
        return cacheService.get<ApiResponse<T>>(cacheKey)!;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await secureRequest(url, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<T> = await response.json();

        // Cache successful responses
        if (cache && result.success) {
          cacheService.set(cacheKey, result, cacheTTL);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (attempt === retries) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, { cache: true, ...config });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, config);
  }
}

export const optimizedApiService = new OptimizedApiService();