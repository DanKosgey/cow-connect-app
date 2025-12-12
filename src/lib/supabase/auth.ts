import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger'; // Assuming a centralized logger from previous context

// Custom error for authentication
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Centralized error logging function
const logError = (message: string, error: unknown) => {
  try {
    logger.error(message, { error: JSON.stringify(error, null, 2) });
  } catch {
    logger.error(`${message} (stringify failed)`, { error });
  }
};

// Auth helper functions
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    logError('Error getting current user', error);
    return null;
  }
};

export const getUserRole = async (userId: string) => {
  try {
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('user_roles')
      .select('role, active')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (!data.active) throw new AuthError('Account is inactive');
    return data.role;
  } catch (error) {
    logError('Error getting user role', error);
    return null;
  }
};

export const checkPermission = async (userId: string, permission: string) => {
  try {
    if (!userId || !permission) throw new Error('User ID and permission are required');

    const { data, error } = await supabase
      .rpc('check_permission', {
        p_user_id: userId,
        p_permission: permission
      });

    if (error) throw error;
    return !!data;
  } catch (error) {
    logError('Error checking permission', error);
    return false;
  }
};

export const logAuthEvent = async (
  userIdOrEmail: string | null,
  eventType: string,
  metadata: Record<string, any> = {}
) => {
  const queueEventLocally = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = 'pending_auth_events';
        const raw = window.localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.push({ userIdOrEmail, eventType, metadata, createdAt: new Date().toISOString() });
        window.localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (error) {
      logError('Failed to queue auth event locally', error);
    }
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      queueEventLocally();
      return;
    }

    const isUuid = (s: string | null): boolean => {
      if (!s) return false;
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
    };

    const payload: any = {
      user_id: isUuid(userIdOrEmail) ? userIdOrEmail : null,
      event_type: eventType,
      metadata: isUuid(userIdOrEmail) ? metadata : { ...(metadata || {}), email: userIdOrEmail }
    };

    const { error } = await supabase
      .from('auth_events')
      .insert([payload]);

    if (error) throw error;
  } catch (error) {
    logError('Error logging auth event', error);
    queueEventLocally();
  }
};

export const invalidateAllSessions = async (userId: string) => {
  try {
    if (!userId) throw new Error('User ID is required');

    const { error } = await supabase
      .from('user_sessions')
      .update({ is_valid: false })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    logError('Error invalidating sessions', error);
  }
};

export const checkAccountLockout = async (email: string) => {
  try {
    if (!email) throw new Error('Email is required');

    const { data, error } = await supabase
      .rpc('check_account_lockout', {
        p_email: email
      });

    if (error) throw error;

    // RPC returns { is_locked, attempts_remaining, locked_until }
    return {
      isLocked: !!data?.is_locked,
      attemptsRemaining: typeof data?.attempts_remaining === 'number' ? data.attempts_remaining : null,
      lockedUntil: data?.locked_until ? new Date(data.locked_until) : null
    };
  } catch (error) {
    logError('Error checking account lockout', error);

    // In development mode, fail-open to avoid blocking
    if (import.meta.env.DEV) {
      return { isLocked: false, attemptsRemaining: null, lockedUntil: null };
    }

    // Fail-secure in production
    return { isLocked: true, attemptsRemaining: 0, lockedUntil: null };
  }
};