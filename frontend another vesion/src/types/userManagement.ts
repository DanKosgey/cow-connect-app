// User Management & Permissions interfaces

export type UserRole = 'admin' | 'staff' | 'farmer' | 'processor' | 'supervisor';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  permissions: string[]; // Array of permission IDs
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  last_login?: string; // ISO date string
  permissions: string[]; // Array of permission IDs
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  is_active: boolean;
  phone?: string;
  department?: string;
  avatar_url?: string;
}

export interface UserManagementData {
  users: User[];
  roles: Role[];
  permissions: Permission[];
}

export interface UserSummary {
  total_active: number;
  total_inactive: number;
  by_role: Record<UserRole, number>;
}

// Using PaginationData from farmerManagement.ts to avoid conflicts

export interface UserListResponse {
  users: User[];
  pagination: import('./farmerManagement').PaginationData;
  summary: UserSummary;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  permissions: string[];
  temporary_password?: boolean;
}

export interface CreateUserResponse {
  user: User;
  temporary_password?: string;
  activation_link: string;
}

export interface UpdateUserPermissionsRequest {
  permissions: string[];
  role: string;
  reason: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  target_user_id: string;
  details: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// Permission matrix as defined in requirements
export const PermissionMatrix: Record<UserRole, string[]> = {
  admin: ['*'],
  staff: ['collections.create', 'collections.read', 'farmers.read'],
  farmer: ['collections.read_own', 'payments.read_own'],
  processor: ['collections.read', 'collections.update', 'quality.read'],
  supervisor: ['collections.read', 'collections.update', 'farmers.read', 'farmers.update']
};