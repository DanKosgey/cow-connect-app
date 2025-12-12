import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth.types';

// Define interfaces for our data structures
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  updated_at?: string | null;
}

export interface UserPermissions {
  role: UserRole;
  permissions: string[];
}

export interface AuthAnalytics {
  last_login: string | null;
  login_count: number;
  failed_login_attempts: number;
  last_password_change: string | null;
}

// Cache keys for different data types
export const AUTH_CACHE_KEYS = {
  USER_PROFILE: 'user-profile',
  USER_PERMISSIONS: 'user-permissions',
  AUTH_ANALYTICS: 'auth-analytics',
} as const;

// Main hook factory for Auth-related data (returns hooks + helpers bound to the current QueryClient)
export const useAuthData = () => {
  const queryClient = useQueryClient();

  // Get user profile data
  const useUserProfile = (userId: string | null): UseQueryResult<UserProfile, Error> => {
    return useQuery<UserProfile, Error>({
      queryKey: [AUTH_CACHE_KEYS.USER_PROFILE, userId],
      queryFn: async () => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        const { data, error } = await supabase
          .from<UserProfile>('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Profile not found');

        return data;
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 10, // 10 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes (replaces gcTime)
    });
  };

  // Get user permissions data
  const useUserPermissions = (userId: string | null): UseQueryResult<UserPermissions, Error> => {
    return useQuery<UserPermissions, Error>({
      queryKey: [AUTH_CACHE_KEYS.USER_PERMISSIONS, userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');

        const { data: roleData, error: roleError } = await supabase
          .from<{ role: string }>('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) throw roleError;
        if (!roleData || !roleData.role) {
          // default to a safe role if none found
          const defaultRole: UserRole = 'farmer';
          return { role: defaultRole, permissions: permissionsMap[defaultRole] };
        }

        const role = roleData.role as UserRole;
        return {
          role,
          permissions: permissionsMap[role] ?? [],
        };
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 15, // 15 minutes
      cacheTime: 1000 * 60 * 45, // 45 minutes
    });
  };

  // Get auth analytics data
  const useAuthAnalytics = (userId: string | null): UseQueryResult<AuthAnalytics, Error> => {
    return useQuery<AuthAnalytics, Error>({
      queryKey: [AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');

        const { data: authEvents, error: eventsError } = await supabase
          .from<any>('auth_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (eventsError) throw eventsError;

        const events = Array.isArray(authEvents) ? authEvents : [];

        const loginEvents = events.filter((e) => e.event_type === 'LOGIN');
        const failedLoginEvents = events.filter((e) => e.event_type === 'FAILED_LOGIN');

        const lastLogin = loginEvents.length > 0 ? loginEvents[0].created_at ?? null : null;
        const loginCount = loginEvents.length;
        const failedLoginAttempts = failedLoginEvents.length;

        const passwordChangeEvents = events.filter((e) => e.event_type === 'PASSWORD_CHANGED');
        const lastPasswordChange = passwordChangeEvents.length > 0 ? passwordChangeEvents[0].created_at ?? null : null;

        return {
          last_login: lastLogin,
          login_count: loginCount,
          failed_login_attempts: failedLoginAttempts,
          last_password_change: lastPasswordChange,
        };
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Update user profile
  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from<UserProfile>('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate profile cache so consumers refetch
    await queryClient.invalidateQueries([AUTH_CACHE_KEYS.USER_PROFILE, userId]);

    return data;
  };

  // Refresh all auth data caches for a user
  const refreshAuthData = async (userId: string | null) => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.USER_PROFILE, userId]),
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.USER_PERMISSIONS, userId]),
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId]),
    ]);
  };

  // Invalidate auth cache (same as refresh but kept semantically separate)
  const invalidateAuthCache = async (userId: string | null) => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.USER_PROFILE, userId]),
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.USER_PERMISSIONS, userId]),
      queryClient.invalidateQueries([AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId]),
    ]);
  };

  return {
    useUserProfile,
    useUserPermissions,
    useAuthAnalytics,
    updateUserProfile,
    refreshAuthData,
    invalidateAuthCache,
  };
};

// Permissions map outside the hook for reuse
const permissionsMap: Record<UserRole, string[]> = {
  admin: [
    'manage_users',
    'manage_farmers',
    'manage_staff',
    'view_reports',
    'manage_settings',
    'approve_payments',
    'manage_credit',
    'view_analytics',
  ],
  staff: ['record_collections', 'view_farmers', 'approve_payments', 'record_quality_tests', 'manage_routes'],
  farmer: ['view_collections', 'view_payments', 'view_credit', 'submit_kyc', 'view_analytics'],
};
