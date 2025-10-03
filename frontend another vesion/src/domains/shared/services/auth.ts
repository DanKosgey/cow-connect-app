import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthService {
  private tokenKey = 'access_token';
  private userKey = 'current_user';

  // Store token and user in localStorage
  setAuth(token: string, user: User) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Get stored user
  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Clear authentication data
  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    const authData = response.data;
    
    this.setAuth(authData.access_token, authData.user);
    return authData;
  }

  // Register user
  async register(userData: RegisterRequest): Promise<User> {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    return response.data;
  }

  // Get current user info from API
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const user = response.data;
    this.setAuth(token, user); // Update stored user info
    return user;
  }

  // Logout user
  logout() {
    this.clearAuth();
  }

  // Check API health
  async checkHealth() {
    const response = await axios.get(`${API_URL}/api/health`);
    return response.data;
  }

  // Test authenticated endpoint
  async testAuth() {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await axios.get(`${API_URL}/api/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
}

export const authService = new AuthService();