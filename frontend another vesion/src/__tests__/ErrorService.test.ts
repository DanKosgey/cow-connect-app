import ErrorService from '@/services/ErrorService';
import { ApiError } from '@/types/error';

describe('ErrorService', () => {
  let errorService: ErrorService;

  beforeEach(() => {
    errorService = ErrorService.getInstance();
    // Mock window.location for redirect tests
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('generateTraceId', () => {
    it('should generate a unique trace ID', () => {
      const traceId1 = (errorService as any).generateTraceId();
      const traceId2 = (errorService as any).generateTraceId();
      
      expect(traceId1).toBeDefined();
      expect(traceId2).toBeDefined();
      expect(traceId1).not.toEqual(traceId2);
      expect(traceId1).toMatch(/^err_/);
    });
  });

  describe('handleApiError', () => {
    it('should handle JavaScript Error objects', () => {
      const error = new Error('Test error');
      const result = errorService.handleApiError(error);
      
      expect(result.error).toBe('client_error');
      expect(result.message).toBe('Test error');
      expect(result.code).toBe(500);
    });

    it('should handle HTTP Response objects', () => {
      const mockResponse = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found'
      }) as any;
      
      const result = errorService.handleApiError(mockResponse);
      
      expect(result.error).toBe('http_error');
      expect(result.message).toBe('Not Found');
      expect(result.code).toBe(404);
    });

    it('should handle generic objects', () => {
      const errorObj = {
        error: 'custom_error',
        message: 'Custom error message',
        code: 418
      };
      
      const result = errorService.handleApiError(errorObj);
      
      expect(result.error).toBe('custom_error');
      expect(result.message).toBe('Custom error message');
      expect(result.code).toBe(418);
    });

    it('should return default error for unknown types', () => {
      const result = errorService.handleApiError('unknown error');
      
      expect(result.error).toBe('unknown_error');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBe(500);
    });
  });

  describe('handleAuthError', () => {
    it('should clear auth tokens and redirect to login', () => {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test User' }));
      
      errorService.handleAuthError();
      
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('handlePermissionError', () => {
    it('should show permission denied message', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      errorService.handlePermissionError('Access denied');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Permission error:', 'Access denied');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('handleValidationError', () => {
    it('should process array format validation errors', () => {
      const validationDetails = [
        { field: 'email', error: 'Invalid email format' },
        { field: 'password', error: 'Password too short' }
      ];
      
      const result = errorService.handleValidationError(validationDetails);
      
      expect(result.email).toBe('Invalid email format');
      expect(result.password).toBe('Password too short');
    });

    it('should process object format validation errors', () => {
      const validationDetails = {
        email: 'Invalid email format',
        password: 'Password too short'
      };
      
      const result = errorService.handleValidationError(validationDetails);
      
      expect(result.email).toBe('Invalid email format');
      expect(result.password).toBe('Password too short');
    });
  });

  describe('handleRateLimitError', () => {
    it('should show rate limit warning', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      errorService.handleRateLimitError(30);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limit exceeded. Retry after 30 seconds');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('handleNetworkError', () => {
    it('should show network error message', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      errorService.handleNetworkError();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Network error occurred');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('processError', () => {
    it('should handle Response objects with specific status codes', () => {
      const mockResponse = new Response(JSON.stringify({
        error: 'unauthorized',
        message: 'Authentication required'
      }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' }
      }) as any;
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = errorService.processError(mockResponse);
      
      expect(result.code).toBe(401);
      expect(localStorage.getItem('authToken')).toBeNull();
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle non-HTTP errors', () => {
      const error = new Error('Generic error');
      const result = errorService.processError(error);
      
      expect(result.error).toBe('client_error');
      expect(result.message).toBe('Generic error');
    });
  });
});