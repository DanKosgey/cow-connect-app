import { supabase } from '@/integrations/supabase/client';

// Custom error for authentication
export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

// Auth helper functions
export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        try {
            console.error('Error getting current user:', JSON.stringify(error, null, 2));
        } catch (e) {
            console.error('Error getting current user (stringify failed):', error);
        }
        return null;
    }
};

export const getUserRole = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role, active')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        if (!data?.active) throw new AuthError('Account is inactive');
        return data.role;
    } catch (error) {
        try {
            console.error('Error getting user role:', JSON.stringify(error, null, 2));
        } catch (e) {
            console.error('Error getting user role (stringify failed):', error);
        }
        return null;
    }
};

export const checkPermission = async (userId: string, permission: string) => {
    try {
        const { data, error } = await supabase
            .rpc('check_permission', {
                p_user_id: userId,
                p_permission: permission
            });

        if (error) throw error;
        return data;
    } catch (error) {
        try {
            console.error('Error checking permission:', JSON.stringify(error, null, 2));
        } catch (e) {
            console.error('Error checking permission (stringify failed):', error);
        }
        return false;
    }
};

export const logAuthEvent = async (
    userIdOrEmail: string | null,
    eventType: string,
    metadata: Record<string, any> = {}
) => {
    try {
        // Ensure there's an active session; if none, queue the event in localStorage
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const key = 'pending_auth_events';
                    const raw = window.localStorage.getItem(key);
                    const list = raw ? JSON.parse(raw) : [];
                    list.push({ userIdOrEmail, eventType, metadata, createdAt: new Date().toISOString() });
                    window.localStorage.setItem(key, JSON.stringify(list));
                }
            } catch (e) {
                // ignore storage errors
            }
            return;
        }

        // Determine whether the caller passed a UUID user id or an email.
        const isUuid = (s: string | null) => {
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
        try {
            console.error('Error logging auth event:', JSON.stringify(error, null, 2));
        } catch (e) {
            console.error('Error logging auth event (stringify failed):', error);
        }
        // If insertion failed due to auth (401) or network, queue it locally
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const key = 'pending_auth_events';
                const raw = window.localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                list.push({ userIdOrEmail, eventType, metadata, createdAt: new Date().toISOString() });
                window.localStorage.setItem(key, JSON.stringify(list));
            }
        } catch (e) {
            /* ignore */
        }
    }
};

export const invalidateAllSessions = async (userId: string) => {
    try {
        const { error } = await supabase
            .from('user_sessions')
            .update({ is_valid: false })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        try {
            console.error('Error invalidating sessions:', JSON.stringify(error, null, 2));
        } catch (e) {
            console.error('Error invalidating sessions (stringify failed):', error);
        }
    }
};

export const checkAccountLockout = async (email: string) => {
    try {
        const { data, error } = await supabase
            .rpc('check_account_lockout', {
                p_email: email
            });

        // Debugging output: show the RPC response so we can diagnose false positives
        try { console.debug('[checkAccountLockout] RPC success for', email, { data }); } catch (e) { /* ignore */ }

        if (error) throw error;

        // RPC returns { is_locked, attempts_remaining, locked_until }
        return {
            isLocked: !!data?.is_locked,
            attemptsRemaining: typeof data?.attempts_remaining === 'number' ? data.attempts_remaining : null,
            lockedUntil: data?.locked_until ? new Date(data.locked_until) : null
        };
    } catch (error) {
        // Stringify the error object to get a useful console representation
        try {
            console.error('Error checking account lockout:', JSON.stringify(error, null, 2));
        } catch (e) {
            // JSON.stringify can fail for circular structures; fallback to default logging
            console.error('Error checking account lockout (stringify failed):', error);
        }
        try { console.debug('[checkAccountLockout] RPC error for', email, { isDev: Boolean(import.meta?.env?.DEV) }); } catch (e) { /* ignore */ }
        // During development it's helpful to fail-open so misconfiguration doesn't block all users.
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (import.meta?.env?.DEV) {
                return { isLocked: false, attemptsRemaining: null, lockedUntil: null };
            }
        } catch (e) {
            // if checking env fails, default to fail-secure below
        }

        return { isLocked: true, attemptsRemaining: 0, lockedUntil: null };
    }
};