import { ErrorCode, ErrorMessages } from './errorHandling';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
};

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function createErrorResponse(
  code: ErrorCode,
  details?: any,
  message?: string
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message: message || ErrorMessages[code],
      details
    }
  };
}

export function isApiResponse<T>(value: any): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error occurred');
  }
  return response.data as T;
}