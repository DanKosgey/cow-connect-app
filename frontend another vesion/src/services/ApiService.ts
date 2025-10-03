/**
 * Production API Service for DairyChain Pro
 * Replaces all dummy data with real backend API calls
 */

import { 
  Farmer, 
  Cow, 
  Collection, 
  Payment, 
  Staff, 
  DashboardStats, 
  User, 
  PaginatedResponse, 
  Message, 
  PaginationData, 
  DashboardAnalytics, 
  SystemConfiguration, 
  PricingConfig, 
  ImpactAnalysis, 
  QualityStandards, 
  ValidationResult, 
  NotificationConfig, 
  IntegrationConfig,
  UserRole,
  UserStatus,
  Permission,
  Role,
  UserManagementData,
  UserListResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserPermissionsRequest,
  NotificationListResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  AdminDashboardData
} from '@/types';
import ErrorService, { setToastFunction } from '@/services/ErrorService';
import { executeWithRetry, RetryOptions } from '@/utils/apiRetryUtils';
import { toast } from '@/hooks/use-toast';
import { connectivityChecker } from '@/utils/connectivityChecker';
import { secureStorage } from '@/utils/secureStorage';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

// Set the toast function for ErrorService to use
setToastFunction((type, title, description) => {
  switch (type) {
    case 'success':
      toast({ title, description, variant: 'default' });
      break;
    case 'error':
      toast({ title, description, variant: 'destructive' });
      break;
    case 'warning':
      toast({ 
        title, 
        description, 
        variant: 'default',
        className: 'border-yellow-500 bg-yellow-50 text-yellow-900'
      });
      break;
    case 'info':
      toast({ title, description, variant: 'default' });
      break;
  }
});

// Use relative path for API calls when using Vite proxy
const API_BASE = '';

/**
 * Generic request helper with proper error handling and retry logic
 */
async function request<T>(path: string, opts: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
  // Debug logging to see what path is being requested
  console.log(`Requesting path: ${path}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };

  // Get the access token from our FastAPI auth service
  const token = supabaseFastApiAuth.getToken();
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Log the token for debugging
  console.log('Authorization header:', headers['Authorization']);

  // Fix the API path to include /api/v1
  const fullPath = path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : '/' + path}`;
  
  // Debug logging to see what path is being constructed
  console.log(`API Request: ${API_BASE}${fullPath}`);
  console.log(`Headers:`, headers);
  
  // For authentication requests, use more conservative retry settings
  const isAuthRequest = path.includes('/auth/');
  const defaultRetryOptions: RetryOptions = isAuthRequest ? {
    maxRetries: 0, // No retries for auth requests to prevent continuous requests
    retryDelay: 1000,
    exponentialBackoff: false,
    shouldRetry: (error: any) => {
      // Don't retry client errors (4xx) except for 429 (rate limiting)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
        return false;
      }
      // For auth requests, be more conservative about retries
      // Also check if server is considered down
      return (error?.status >= 500 || 
             error?.message?.includes('NetworkError') || 
             error?.message?.includes('Failed to fetch')) &&
             !connectivityChecker.isServerConsideredDown();
    }
  } : {
    // For non-auth requests, still check server status
    maxRetries: 1, // Reduced retries for regular requests
    shouldRetry: (error: any) => {
      // Don't retry client errors (4xx) except for 429 (rate limiting)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
        return false;
      }
      // Check if server is considered down
      return (error?.status >= 500 || 
             error?.message?.includes('NetworkError') || 
             error?.message?.includes('Failed to fetch')) &&
             !connectivityChecker.isServerConsideredDown();
    }
  };
  
  const finalRetryOptions = retryOptions || defaultRetryOptions;
  
  // Check if server is considered down before making request
  if (connectivityChecker.isServerConsideredDown()) {
    throw new Error('Server is currently unavailable. Please try again later.');
  }
  
  // Wrap the request in retry logic
  return executeWithRetry<T>(async () => {
    const response = await fetch(`${API_BASE}${fullPath}`, {
      ...opts,
      headers,
      credentials: 'include', // Include cookies for authentication
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, [...response.headers.entries()]);
    
    let responseData;
    let errorData = null;
    
    try {
      responseData = await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, the response might be text
      try {
        responseData = await response.text();
      } catch (textError) {
        responseData = 'Unable to parse response';
      }
    }
    
    console.log(`Response data:`, responseData);
    
    if (!response.ok) {
      // For error responses, try to extract meaningful error message
      let errorText = 'Unknown error occurred';
      let errorDetails = null;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorText = responseData.detail || responseData.message || JSON.stringify(responseData);
        errorDetails = responseData;
      } else if (typeof responseData === 'string') {
        errorText = responseData;
      }
      
      console.log(`API Error Response: ${response.status} - ${errorText}`);
      console.log(`API Error Details:`, errorDetails);
      
      // If it's a server error, mark server as potentially down
      if (response.status >= 500) {
        connectivityChecker.markServerAsDown();
      }
      
      // Use our ErrorService to handle the error properly
      const errorService = ErrorService.getInstance();
      const apiError = errorService.processError(response, {
        component: 'ApiService',
        action: `${opts.method || 'GET'} ${path}`,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        route: window.location.pathname
      });
      
      // Create a proper error object to throw
      const error = new Error(`API ${response.status}: ${apiError.message}`);
      (error as any).status = response.status;
      throw error;
    }

    // Mark server as up on successful response
    connectivityChecker.markServerAsUp();
    
    return responseData;
  }, finalRetryOptions).catch(error => {
    // Handle network errors or other exceptions
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Network error - mark server as potentially down
      connectivityChecker.markServerAsDown();
      
      // Network error
      const errorService = ErrorService.getInstance();
      errorService.handleNetworkError();
      throw new Error('Network error - please check your connection');
    }
    
    // Re-throw other errors
    throw error;
  });
}

/**
 * Authentication API
 */
export const AuthAPI = {
  login: (username: string, password: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    
  // Dummy login for testing
  dummyLogin: (username: string, password: string) => {
    // Log the request data for debugging (without password)
    console.log('Dummy login request for username:', username);
    
    // For dummy login, we need to send username and password as query parameters
    const queryParams = new URLSearchParams({ username, password });
    
    return request<{ 
      success: boolean; 
      access_token: string; 
      token_type: string; 
      user: User;
      redirect_url: string;
    }>(`/auth/login/dummy?${queryParams}`, {
      method: 'POST',
    });
  },
    
  register: (userData: any) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    
  getMe: () => request<User>('/auth/me').catch(error => {
    // Handle authentication errors gracefully
    if (error.status === 401) {
      console.log('User not authenticated, returning null');
      return null;
    }
    throw error;
  }),
  
  logout: async () => {
    // Use supabaseFastApiAuth logout method
    await supabaseFastApiAuth.logout();
  }
};

/**
 * Farmers API
 */
export const FarmersAPI = {
  list: (limit = 100, offset = 0, search?: string, status?: string) => {
    let url = `/farmers?limit=${limit}&offset=${offset}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;
    return request<PaginatedResponse<Farmer>>(url);
  },
    
  get: (id: string) =>
    request<Farmer>(`/farmers/${id}`),
    
  create: (farmerData: Partial<Farmer>) =>
    request<Farmer>('/farmers', {
      method: 'POST',
      body: JSON.stringify(farmerData),
    }),
    
  update: (id: string, farmerData: Partial<Farmer>) =>
    request<Farmer>(`/farmers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(farmerData),
    }),
    
  delete: (id: string) =>
    request<{ message: string }>(`/farmers/${id}`, {
      method: 'DELETE',
    }),
    
  updateKYC: (id: string, status: string, reason?: string) =>
    request<Farmer>(`/farmers/${id}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
    
  updateStatus: (id: string, statusData: { status: 'active' | 'suspended' | 'pending_review' }) =>
    request<Farmer>(`/farmers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    }),
    
  uploadKYCDocument: async (farmerId: string, file: File, docType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    
    const response = await fetch(`${API_BASE}/farmers/${farmerId}/kyc-upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      // Read the response body once and store it
      let errorText;
      try {
        const errorData = await response.json();
        errorText = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (jsonError) {
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = 'Upload failed with unknown error';
        }
      }
      throw new Error(`Upload failed: ${errorText}`);
    }
    
    return response.json();
  },
  
  getAnalytics: (farmerId: string) =>
    request<any>(`/farmers/${farmerId}/analytics`),
    
  getPayments: (farmerId: string, limit = 100, offset = 0) => {
    const url = `/farmers/${farmerId}/payments?limit=${limit}&offset=${offset}`;
    return request<PaginatedResponse<Payment>>(url);
  },
  
  getCollections: (farmerId: string, limit = 100, offset = 0) => {
    const url = `/farmers/${farmerId}/collections?limit=${limit}&offset=${offset}`;
    return request<PaginatedResponse<Collection>>(url);
  }
};

/**
 * Collections API
 */
export const CollectionsAPI = {
  list: (limit = 100, offset = 0, farmerId?: string, staffId?: string) => {
    let url = `/collections?limit=${limit}&offset=${offset}`;
    if (farmerId) url += `&farmer_id=${farmerId}`;
    if (staffId) url += `&staff_id=${staffId}`;
    return request<PaginatedResponse<Collection>>(url);
  },
  
  get: (id: string) =>
    request<Collection>(`/collections/${id}`),
  
  create: (collectionData: Partial<Collection>) =>
    request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    }),
    
  update: (id: string, collectionData: Partial<Collection>) =>
    request<Collection>(`/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(collectionData),
    }),
    
  delete: (id: string) =>
    request<{ message: string }>(`/collections/${id}`, {
      method: 'DELETE',
    }),
    
  // Bulk collection creation
  createBulk: (bulkData: { collections: Partial<Collection>[], route_id: string, staff_id: string, collected_at: string, staff_notes?: string, staff_signature?: string }) =>
    request<{ created_collections: any[], failed_collections: any[], summary: any }>('/collections/bulk', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    }),
    
  // NEW: Receipt download function
  downloadReceipt: async (collectionId: string) => {
    const response = await fetch(`${API_BASE}/collections/${collectionId}/receipt`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      // Read the response body once and store it
      let errorText;
      try {
        const errorData = await response.json();
        errorText = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (jsonError) {
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = 'Receipt download failed with unknown error';
        }
      }
      throw new Error(`Receipt download failed: ${errorText}`);
    }
    
    // Return the blob for download
    return response.blob();
  },
  
  uploadPhoto: async (collectionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/collections/${collectionId}/photo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      // Read the response body once and store it
      let errorText;
      try {
        const errorData = await response.json();
        errorText = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (jsonError) {
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = 'Photo upload failed with unknown error';
        }
      }
      throw new Error(`Photo upload failed: ${errorText}`);
    }
    
    return response.json();
  }
};

/**
 * Payments API
 */
export const PaymentsAPI = {
  list: (limit = 100, offset = 0, farmerId?: string) => {
    let url = `/payments?limit=${limit}&offset=${offset}`;
    if (farmerId) url += `&farmer_id=${farmerId}`;
    return request<Payment[]>(url);
  },
  
  get: (id: string) =>
    request<Payment>(`/payments/${id}`),
    
  create: (paymentData: Partial<Payment>) =>
    request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),
    
  update: (id: string, paymentData: Partial<Payment>) =>
    request<Payment>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    }),
    
  delete: (id: string) =>
    request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    }),
    
  getProjections: (farmerId: string) =>
    request<any>(`/farmers/${farmerId}/payments/projections`),
    
  getHistory: (farmerId: string, params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    start_date?: string; 
    end_date?: string; 
    payment_method?: string; 
    min_amount?: number; 
    max_amount?: number; 
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return request<any>(`/farmers/${farmerId}/payments${queryString ? `?${queryString}` : ''}`);
  }
};

/**
 * Dispute API
 */
export const DisputeAPI = {
  submit: (disputeData: any) =>
    request<any>('/collections/dispute', {
      method: 'POST',
      body: JSON.stringify(disputeData),
    }),
    
  get: (id: string) =>
    request<any>(`/collections/dispute/${id}`)
};

/**
 * Cows API
 */
export const CowsAPI = {
  list: (farmerId?: string) => {
    let url = '/cows';
    if (farmerId) url += `?farmer_id=${farmerId}`;
    return request<Cow[]>(url);
  },
  
  get: (id: string) =>
    request<Cow>(`/cows/${id}`),
  
  create: (cowData: Partial<Cow>) =>
    request<Cow>('/cows', {
      method: 'POST',
      body: JSON.stringify(cowData),
    }),
    
  update: (id: string, cowData: Partial<Cow>) =>
    request<Cow>(`/cows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cowData),
    }),
    
  delete: (id: string) =>
    request<{ message: string }>(`/cows/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * Staff API
 */
export const StaffAPI = {
  list: () => request<PaginatedResponse<Staff>>('/staff'),
  
  get: (id: string) =>
    request<Staff>(`/staff/${id}`),
  
  create: (staffData: Partial<Staff>) =>
    request<Staff>('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    }),
    
  update: (id: string, staffData: Partial<Staff>) =>
    request<Staff>(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    }),
    
  delete: (id: string) =>
    request<{ message: string }>(`/staff/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * Analytics API
 */
export const AnalyticsAPI = {
  getDashboardStats: () => {
    console.log('Fetching dashboard stats');
    return request<DashboardStats>('/analytics/dashboard');
  },
  
  getAdminDashboard: (period: string = '30days', region: string = 'all') => {
    // Fixed the URL - it should be /analytics/admin/dashboard not /admin/analytics/dashboard
    let url = `/analytics/admin/dashboard?period=${period}&region=${region}`;
    return request<AdminDashboardData>(url);
  },
};

/**
 * System Configuration API
 */
export const ConfigAPI = {
  // Get current system configuration
  getSystemConfig: () => {
    return request<SystemConfiguration>('/admin/config');
  },
  
  // Update pricing configuration
  updatePricingConfig: (pricingData: Partial<PricingConfig> & { effective_date: string }) => {
    return request<{
      updated_config: PricingConfig;
      affected_farmers: number;
      estimated_impact: ImpactAnalysis;
    }>('/admin/config/pricing', {
      method: 'PUT',
      body: JSON.stringify(pricingData),
    });
  },
  
  // Update quality standards
  updateQualityStandards: (qualityData: QualityStandards) => {
    return request<{
      updated_standards: QualityStandards;
      validation_results: ValidationResult[];
    }>('/admin/config/quality-standards', {
      method: 'PUT',
      body: JSON.stringify(qualityData),
    });
  },
  
  // Update notification settings
  updateNotificationSettings: (notificationData: Partial<NotificationConfig>) => {
    return request<NotificationConfig>('/admin/config/notifications', {
      method: 'PUT',
      body: JSON.stringify(notificationData),
    });
  },
  
  // Update integration settings
  updateIntegrationSettings: (integrationData: Partial<IntegrationConfig>) => {
    return request<IntegrationConfig>('/admin/config/integrations', {
      method: 'PUT',
      body: JSON.stringify(integrationData),
    });
  },
};

/**
 * Notifications API
 */
export const NotificationsAPI = {
  // List notifications with pagination
  list: (page: number = 1, unread_only: boolean = true) => {
    let url = `/notifications?page=${page}`;
    if (unread_only) url += `&unread_only=${unread_only}`;
    return request<NotificationListResponse>(url);
  },
  
  // Mark a notification as read
  markAsRead: (id: string) => {
    return request<Notification>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },
  
  // Mark all notifications as read
  markAllAsRead: () => {
    return request<{ message: string }>(`/notifications/read-all`, {
      method: 'POST',
    });
  },
  
  // Get notification preferences
  getPreferences: () => {
    return request<NotificationPreferences>('/notifications/preferences');
  },
  
  // Update notification preferences
  updatePreferences: (preferences: UpdateNotificationPreferencesRequest) => {
    return request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },
  
  // Delete a notification
  delete: (id: string) => {
    return request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Delete all read notifications
  deleteAllRead: () => {
    return request<{ message: string }>(`/notifications/delete-all-read`, {
      method: 'DELETE',
    });
  }
};

/**
 * AI Chat API
 */
export const ChatAPI = {
  sendMessage: (message: string, context?: string, sessionId?: string) =>
    request<{ response: string; model: string; timestamp: string; session_id?: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, session_id: sessionId }),
    }),
};

/**
 * Messages API
 */
export const MessagesAPI = {
  send: (messageData: { recipient_id: string, recipient_type: 'farmer' | 'staff' | 'admin', message: string, message_type: 'text' | 'alert' | 'reminder', priority: 'low' | 'medium' | 'high' }) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    }),
  
  list: (userId: string, limit = 50, offset = 0) =>
    request<{ messages: Message[], pagination: PaginationData }>(`/messages?user_id=${userId}&limit=${limit}&offset=${offset}`),
  
  markAsRead: (messageId: string) =>
    request<Message>(`/messages/${messageId}/read`, {
      method: 'PUT',
    }),
};

/**
 * Users API
 */
export const UsersAPI = {
  // List users with pagination and filtering
  list: (page: number = 1, role: string = 'all', status: string = 'active', search: string = '') => {
    let url = `/admin/users?page=${page}`;
    if (role !== 'all') url += `&role=${role}`;
    if (status !== 'all') url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return request<UserListResponse>(url);
  },
  
  // Get a specific user
  get: (id: string) => {
    return request<User>(`/admin/users/${id}`);
  },
  
  // Create a new user
  create: (userData: CreateUserRequest) => {
    return request<CreateUserResponse>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // Update user permissions
  updatePermissions: (userId: string, permissionData: UpdateUserPermissionsRequest) => {
    return request<User>(`/admin/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(permissionData),
    });
  },
  
  // Update user status
  updateStatus: (userId: string, status: UserStatus) => {
    return request<User>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  
  // Delete a user
  delete: (userId: string) => {
    return request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
  
  // Get user audit logs
  getAuditLogs: (userId: string, limit: number = 50) => {
    return request<any[]>(`/admin/users/${userId}/audit-logs?limit=${limit}`);
  },
  
  // Reset user password
  resetPassword: (userId: string) => {
    return request<{ message: string, temporary_password?: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
    });
  },
  
  // Get available roles and permissions
  getRolesAndPermissions: () => {
    return request<{ roles: Role[], permissions: Permission[] }>('/admin/users/roles-permissions');
  }
};

/**
 * File Upload API
 */
export const FileAPI = {
  uploadImage: async (file: File, folder = 'images') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image upload failed: ${errorText}`);
    }
    
    return response.json();
  },
  
  uploadDocument: async (file: File, folder = 'documents') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await fetch(`${API_BASE}/upload/document`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Document upload failed: ${errorText}`);
    }
    
    return response.json();
  }
};

/**
 * Routes API
 */
export const RoutesAPI = {
  generateDailyRoute: (staffId: string, routeDate: string) =>
    request<any>(`/routes/staff/${staffId}/routes/daily?route_date=${routeDate}`),
    
  getStaffRouteHistory: (staffId: string, days: number = 30) =>
    request<any[]>(`/routes/staff/${staffId}/routes/history?days=${days}`),
    
  assignFarmersToStaff: (staffId: string, farmerIds: string[]) =>
    request<{ message: string }>(`/routes/staff/${staffId}/routes/assign-farmers`, {
      method: 'POST',
      body: JSON.stringify({ farmer_ids: farmerIds }),
    }),
    
  startRouteExecution: (routeId: string, staffId: string) =>
    request<{ message: string }>(`/routes/routes/${routeId}/start`, {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId }),
    }),
    
  completeRouteExecution: (routeId: string, staffId: string) =>
    request<{ message: string }>(`/routes/routes/${routeId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId }),
    }),
    
  recordGPSTrackPoint: (routeId: string, staffId: string, location: { latitude: number; longitude: number }) =>
    request<{ message: string }>(`/routes/routes/${routeId}/track`, {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId, location }),
    }),
    
  getTrackingSession: (staffId: string) =>
    request<any>(`/routes/staff/${staffId}/tracking/session`),
    
  // Admin routes
  assignFarmersBulk: (assignments: { staff_id: string; farmer_ids: string[] }[]) =>
    request<{ message: string; results: any[] }>('/admin/routes/assign-farmers', {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    }),
    
  generateDailyRoutesForAll: (routeDate: string) =>
    request<{ message: string; successful_routes: number; failed_routes: number; results: any[] }>('/admin/routes/generate-daily', {
      method: 'POST',
      body: JSON.stringify({ route_date: routeDate }),
    }),
    
  adjustRoute: (routeId: string, adjustments: any) =>
    request<{ message: string }>(`/admin/routes/${routeId}/adjust`, {
      method: 'PUT',
      body: JSON.stringify(adjustments),
    }),
    
  createRouteTemplate: (templateData: any) =>
    request<{ message: string; template_id: string }>('/admin/routes/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    }),
    
  listRouteTemplates: () =>
    request<{ templates: any[]; total_count: number }>('/admin/routes/templates'),
    
  // Route optimization and management
  optimizeRoute: (routeId: string, criteria: 'distance' | 'time' | 'priority') =>
    request<any>(`/admin/routes/${routeId}/optimize`, {
      method: 'PUT',
      body: JSON.stringify({ optimization_criteria: criteria }),
    }),
    
  getStaffRoutes: (staffId: string) =>
    request<any[]>(`/routes/staff/${staffId}/routes`),
    
  startRoute: (routeId: string, staffLocation: { lat: number; lng: number }) =>
    request<any>(`/routes/${routeId}/start`, {
      method: 'POST',
      body: JSON.stringify({ staff_location: staffLocation }),
    }),
};

/**
 * Health Check API
 */
export const HealthAPI = {
  check: () => request<{
    api: string;
    database: any;
    ai_service: any;
    timestamp: string;
  }>('/health'),
};

// Export all APIs as default
export default {
  Auth: AuthAPI,
  Farmers: FarmersAPI,
  Collections: CollectionsAPI,
  Payments: PaymentsAPI,
  Dispute: DisputeAPI,
  Cows: CowsAPI,
  Staff: StaffAPI,
  Analytics: AnalyticsAPI,
  Config: ConfigAPI,
  Users: UsersAPI,
  Notifications: NotificationsAPI,
  Chat: ChatAPI,
  File: FileAPI,
  Routes: RoutesAPI,
  Messages: MessagesAPI,
  Health: HealthAPI,
};