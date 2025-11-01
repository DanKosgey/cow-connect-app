import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth.types';

// Define interfaces for our data structures
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  updated_at?: string;
}

interface UserPermissions {
  role: UserRole;
  permissions: string[];
}

interface AuthAnalytics {
  last_login: string;
  login_count: number;
  failed_login_attempts: number;
  last_password_change: string;
}

// Cache keys for different data types
export const AUTH_CACHE_KEYS = {
  USER_PROFILE: 'user-profile',
  USER_PERMISSIONS: 'user-permissions',
  AUTH_ANALYTICS: 'auth-analytics'
};

// Main hook for Auth-related data
export const useAuthData = () => {
  const queryClient = useQueryClient();

  // Get user profile data
  const useUserProfile = (userId: string | null) => {
    return useQuery<UserProfile>({
      queryKey: [AUTH_CACHE_KEYS.USER_PROFILE, userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Get user permissions data
  const useUserPermissions = (userId: string | null) => {
    return useQuery<UserPermissions>({
      queryKey: [AUTH_CACHE_KEYS.USER_PERMISSIONS, userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');
        
        // Get user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) throw roleError;

        // Define permissions based on role
        const permissionsMap: Record<UserRole, string[]> = {
          admin: [
            'manage_users',
            'manage_farmers',
            'manage_staff',
            'view_reports',
            'manage_settings',
            'approve_payments',
            'manage_credit',
            'view_analytics'
          ],
          staff: [
            'record_collections',
            'view_farmers',
            'approve_payments',
            'record_quality_tests',
            'manage_routes'
          ],
          farmer: [
            'view_collections',
            'view_payments',
            'view_credit',
            'submit_kyc',
            'view_analytics'
          ]
        };

        return {
          role: roleData.role as UserRole,
          permissions: permissionsMap[roleData.role as UserRole] || []
        };
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 15, // 15 minutes
      gcTime: 1000 * 60 * 45, // 45 minutes
    });
  };

  // Get auth analytics data
  const useAuthAnalytics = (userId: string | null) => {
    return useQuery<AuthAnalytics>({
      queryKey: [AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');
        
        // Get auth events for analytics
        const { data: authEvents, error: eventsError } = await supabase
          .from('auth_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (eventsError) throw eventsError;

        // Calculate analytics
        const loginEvents = authEvents?.filter(event => event.event_type === 'LOGIN') || [];
        const failedLoginEvents = authEvents?.filter(event => event.event_type === 'FAILED_LOGIN') || [];
        
        const lastLogin = loginEvents.length > 0 ? loginEvents[0].created_at : '';
        const loginCount = loginEvents.length;
        const failedLoginAttempts = failedLoginEvents.length;
        
        // Find last password change event
        const passwordChangeEvents = authEvents?.filter(event => event.event_type === 'PASSWORD_CHANGED') || [];
        const lastPasswordChange = passwordChangeEvents.length > 0 ? passwordChangeEvents[0].created_at : '';

        return {
          last_login: lastLogin,
          login_count: loginCount,
          failed_login_attempts: failedLoginAttempts,
          last_password_change: lastPasswordChange
        };
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Update user profile
  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Invalidate profile cache
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.USER_PROFILE, userId] });
    
    return data;
  };

  // Refresh all auth data
  const refreshAuthData = (userId: string | null) => {
    if (!userId) return;
    
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.USER_PROFILE, userId] });
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.USER_PERMISSIONS, userId] });
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId] });
  };

  // Mutation to invalidate all auth caches
  const invalidateAuthCache = (userId: string | null) => {
    if (!userId) return;
    
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.USER_PROFILE, userId] });
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.USER_PERMISSIONS, userId] });
    queryClient.invalidateQueries({ queryKey: [AUTH_CACHE_KEYS.AUTH_ANALYTICS, userId] });
  };

  return {
    useUserProfile,
    useUserPermissions,
    useAuthAnalytics,
    updateUserProfile,
    refreshAuthData,
    invalidateAuthCache
  };
};