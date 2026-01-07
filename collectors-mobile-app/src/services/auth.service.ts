
import { supabase } from './supabase';
import * as SecureStore from 'expo-secure-store';
import { hashPassword, verifyPassword } from './crypto.utils';
import { getDatabase } from './database';

interface LoginCredentials {
    email: string;
    password: string;
}

export const authService = {
    // Online login
    async loginOnline(credentials: LoginCredentials) {
        try {
            // Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (authError) throw authError;

            // Fetch user role from user_roles table (like web app)
            if (authData.user) {
                const { data: userRoleData, error: roleError } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();

                if (roleError) {
                    console.error('Error fetching user role:', roleError);
                }

                // Check if user has collector role from user_roles table
                if (!userRoleData || userRoleData.role !== 'collector') {
                    // Sign out the user since they're not a collector
                    await supabase.auth.signOut();
                    throw new Error('Access denied. This app is only for collectors. Please use the appropriate app for your role.');
                }

                // Fetch staff profile to get additional details
                const { data: staffData, error: staffError } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();

                if (staffError) throw staffError;

                if (!staffData) {
                    // Sign out the user since they don't have a staff profile
                    await supabase.auth.signOut();
                    throw new Error('No staff profile found for this user. Please contact an administrator.');
                }

                // Cache credentials locally
                await this.cacheCredentials({
                    user_id: authData.user.id,
                    email: credentials.email,
                    password_hash: await hashPassword(credentials.password),
                    role: userRoleData.role,
                    staff_id: staffData.id,
                    full_name: staffData.full_name,
                    phone: staffData.phone,
                    token: authData.session?.access_token,
                    refresh_token: authData.session?.refresh_token,
                });

                return { user: authData.user, staff: staffData };
            }
            throw new Error("User not found in auth response");
        } catch (error) {
            console.error('Online login failed:', error);
            throw error;
        }
    },

    // Offline login
    async loginOffline(credentials: LoginCredentials) {
        const db = await getDatabase();

        const result: any = await db.getFirstAsync(
            'SELECT * FROM auth_cache WHERE email = ? LIMIT 1',
            [credentials.email]
        );

        if (!result) {
            throw new Error('No cached credentials found. Please login online first.');
        }

        // Check if user has collector role
        if (result.role !== 'collector') {
            throw new Error('Access denied. This app is only for collectors. Please use the appropriate app for your role.');
        }

        // Verify password against cached hash
        const isValid = await verifyPassword(credentials.password, result.password_hash);

        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await db.runAsync(
            'UPDATE auth_cache SET last_login = CURRENT_TIMESTAMP WHERE email = ?',
            [credentials.email]
        );

        return {
            user: {
                id: result.user_id,
                email: result.email,
            },
            staff: {
                id: result.staff_id,
                role: result.role,
                full_name: result.full_name,
                phone: result.phone,
            },
            isOfflineMode: true,
        };
    },

    // Cache credentials
    async cacheCredentials(data: any) {
        console.log('🔵 [AUTH] Starting credential caching...');
        console.log('🔵 [AUTH] Data to cache:', {
            user_id: data.user_id,
            email: data.email,
            role: data.role,
            staff_id: data.staff_id,
            full_name: data.full_name,
        });

        try {
            const db = await getDatabase();
            console.log('🔵 [AUTH] Database instance obtained');

            await db.runAsync(
                `INSERT OR REPLACE INTO auth_cache 
           (user_id, email, password_hash, role, staff_id, full_name, phone, token, refresh_token, last_login, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [
                    data.user_id,
                    data.email,
                    data.password_hash,
                    data.role,
                    data.staff_id,
                    data.full_name,
                    data.phone,
                    data.token,
                    data.refresh_token,
                ]
            );
            console.log('✅ [AUTH] Credentials saved to SQLite');

            // Verify the save
            const verify: any = await db.getFirstAsync(
                'SELECT * FROM auth_cache WHERE email = ?',
                [data.email]
            );
            console.log('✅ [AUTH] Verification - Record exists:', !!verify);
            if (verify) {
                console.log('✅ [AUTH] Cached user:', {
                    email: verify.email,
                    staff_id: verify.staff_id,
                    role: verify.role,
                });
            }

            // Store in SecureStore (native) or localStorage (web) for quick access
            const { Platform } = require('react-native');
            console.log('🔵 [AUTH] Platform:', Platform.OS);

            if (Platform.OS === 'web') {
                localStorage.setItem('cached_user', JSON.stringify(data));
                console.log('✅ [AUTH] Credentials saved to localStorage');
            } else {
                await SecureStore.setItemAsync('cached_user', JSON.stringify(data));
                console.log('✅ [AUTH] Credentials saved to SecureStore');
            }

            console.log('✅ [AUTH] Credential caching COMPLETE');
        } catch (error) {
            console.error('❌ [AUTH] Credential caching FAILED:', error);
            throw error;
        }
    },
};
