// Error Handling & Recovery interfaces

export interface ErrorInfo {
  componentStack: string;
  errorBoundary: string;
  eventId: string;
  timestamp: Date;
  userAgent: string;
  userId?: string;
  route: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  code: number;
  timestamp: string;
  trace_id: string;
}

export interface ValidationError {
  field: string;
  error: string;
}

export interface NetworkError {
  message: string;
  status?: number;
  url: string;
  timestamp: Date;
}

export interface OfflineError {
  message: string;
  timestamp: Date;
  cachedDataAvailable: boolean;
}

export interface PermissionError {
  message: string;
  requiredPermission: string;
  userRole: string;
}

export interface RateLimitError {
  message: string;
  retryAfter: number; // seconds
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  route: string;
  timestamp: Date;
  userAgent: string;
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  stackTrace?: string;
  componentStack?: string;
  userFeedback?: string;
  reportedAt: Date;
}