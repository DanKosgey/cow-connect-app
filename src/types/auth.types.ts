// Types for authentication system
import { User } from '@supabase/supabase-js';

export enum UserRole {
    ADMIN = 'admin',
    STAFF = 'staff',
    FARMER = 'farmer'
}

export interface UserRoleRecord {
    id: string;
    user_id: string;
    role: UserRole;
    profile_id: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AuthEvent {
    id: string;
    user_id: string | null;
    event_type: string;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

export interface UserSession {
    id: string;
    user_id: string;
    session_token: string;
    refresh_token: string | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
    last_activity: string;
    ip_address: string | null;
    user_agent: string | null;
    is_valid: boolean;
}

export interface LoginAttempt {
    id: string;
    email: string;
    ip_address: string;
    attempt_time: string;
    is_successful: boolean;
}

// Extended User type with role information
export interface AuthUser extends User {
    role?: UserRole;
    profile_id?: string;
}

// Permission types
export type Permission = 
    | 'create:farmers'
    | 'read:farmers'
    | 'update:farmers'
    | 'delete:farmers'
    | 'create:collections'
    | 'read:collections'
    | 'update:collections'
    | 'delete:collections'
    | 'create:payments'
    | 'read:payments'
    | 'update:payments'
    | 'delete:payments'
    | 'read:analytics'
    | 'manage:users'
    | 'manage:roles';

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        'create:farmers',
        'read:farmers',
        'update:farmers',
        'delete:farmers',
        'create:collections',
        'read:collections',
        'update:collections',
        'delete:collections',
        'create:payments',
        'read:payments',
        'update:payments',
        'delete:payments',
        'read:analytics',
        'manage:users',
        'manage:roles'
    ],
    [UserRole.STAFF]: [
        'read:farmers',
        'create:collections',
        'read:collections',
        'update:collections',
        'read:payments',
        'read:analytics'
    ],
    [UserRole.FARMER]: [
        'read:farmers',
        'read:collections',
        'read:payments'
    ]
};

// Auth error type
export interface AuthError {
    message: string;
}

export interface AuthResponse {
    error?: AuthError;
}

// Auth context types
export interface AuthContextType {
    user: AuthUser | null;
    role: UserRole | null;
    isLoading: boolean;
    hasPermission: (permission: Permission) => boolean;
    signIn: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
    signUp: (email: string, password: string, fullName: string, phone: string, role: UserRole) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}