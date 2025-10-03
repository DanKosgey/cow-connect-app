/**
 * Supabase FastAPI Authentication Service
 * Integrates with the new FastAPI backend authentication system
 */
import { User } from '@supabase/supabase-js';

// Define types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  password: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface UpdateRoleRequest {
  role: string;
}

export interface AuthResponse {
  message: string;
  user?: Record<string, any>;
  session?: Record<string, any>;
  role?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user?: Record<string, any>;
}

export interface UserProfileResponse {
  user: Record<string, any>;
  profile?: Record<string, any>;
}

export interface UserListResponse {
  users: Record<string, any>[];
}

// Get API base URL from environment or default to backend URL
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8002');

class SupabaseFastApiAuthService {
  private tokenKey = 'access_token';

  // Store token in localStorage
  private setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  }

  // Refresh token (placeholder for now)
  async refreshToken(): Promise<boolean> {
    // In a real implementation, this would call the refresh endpoint
    // For now, we'll just check if the token is expired
    if (this.isTokenExpired()) {
      this.clearAuth();
      return false;
    }
    return true;
  }

  // Clear authentication data
  private clearAuth() {
    localStorage.removeItem(this.tokenKey);
  }

  // Get headers with authorization
  private getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  // Generic request helper
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Check if token is expired for authenticated requests
    const token = this.getToken();
    if (token && this.isTokenExpired()) {
      this.clearAuth();
      throw new Error('Session expired. Please log in again.');
    }

    const url = `${API_BASE}/api/v1/supabase-auth${path}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 401 errors (token expired/invalid)
        if (response.status === 401) {
          this.clearAuth();
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Please check your internet connection');
      }
      throw error;
    }
  }

  // Sign up a new user
  async signup(data: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await this.request<AuthResponse>('/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // Provide better user feedback
      if (response.message && response.message.includes('verify')) {
        response.message = 'Signup successful! Please check your email to verify your account before logging in.';
      }
      
      return response;
    } catch (error: any) {
      // Handle common signup errors
      if (error.message && error.message.includes('Email address')) {
        throw new Error('Please use a valid email address for signup.');
      }
      throw error;
    }
  }

  // Login user
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.request<AuthResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Store token if provided
      if (response.session?.access_token) {
        this.setToken(response.session.access_token);
      }

      return response;
    } catch (error: any) {
      // Handle 403 errors for email verification
      if (error.message && error.message.includes('verify your email')) {
        throw new Error('Please verify your email before logging in. Check your inbox for the verification email.');
      }
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<{ message: string }> {
    try {
      const response = await this.request<{ message: string }>('/logout', {
        method: 'POST',
      });
      this.clearAuth();
      return response;
    } catch (error) {
      // Even if the request fails, clear local auth data
      this.clearAuth();
      return { message: 'Logout successful' };
    }
  }

  // Resend verification email
  async resendVerification(data: ResendVerificationRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/resend-verification', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Request password reset
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update password
  async updatePassword(data: UpdatePasswordRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/update-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get current user info
  async getCurrentUser(): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/me');
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<UserListResponse> {
    return this.request<UserListResponse>('/admin/users');
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, data: UpdateRoleRequest): Promise<{ message: string; profile?: Record<string, any> }> {
    return this.request<{ message: string; profile?: Record<string, any> }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // User dashboard
  async getUserDashboard(): Promise<{ message: string; user: Record<string, any> }> {
    return this.request<{ message: string; user: Record<string, any> }>('/user/dashboard');
  }

  // Admin dashboard
  async getAdminDashboard(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/admin/dashboard');
  }

  // Farmer dashboard
  async getFarmerDashboard(): Promise<{ message: string; user: Record<string, any> }> {
    return this.request<{ message: string; user: Record<string, any> }>('/farmer/dashboard');
  }

  // Staff dashboard
  async getStaffDashboard(): Promise<{ message: string; user: Record<string, any> }> {
    return this.request<{ message: string; user: Record<string, any> }>('/staff/dashboard');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Check if user has a specific role
  async hasRole(role: string): Promise<boolean> {
    try {
      const userData = await this.getCurrentUser();
      return userData.profile?.role === role;
    } catch (error) {
      return false;
    }
  }

  // Check if user is admin
  async isAdmin(): Promise<boolean> {
    return this.hasRole('admin');
  }

  // Check if user is staff
  async isStaff(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'staff' || role === 'admin';
  }

  // Check if user is farmer
  async isFarmer(): Promise<boolean> {
    return this.hasRole('farmer');
  }

  // Get user role
  async getUserRole(): Promise<string | null> {
    try {
      const userData = await this.getCurrentUser();
      return userData.profile?.role || null;
    } catch (error) {
      return null;
    }
  }
}

// Create singleton instance
export const supabaseFastApiAuth = new SupabaseFastApiAuthService();