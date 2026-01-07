import React, { useEffect, useState, createContext, useContext } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/auth.service';
import { supabase } from '../services/supabase';

interface LoginCredentials {
    email: string;
    password: string;
}

interface AuthContextType {
    user: any;
    isOnline: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<any>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(() => {
        if (Platform.OS === 'web') {
            return window.navigator.onLine;
        }
        return true;
    });
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribe = () => { };

        if (Platform.OS === 'web') {
            setIsOnline(window.navigator.onLine);
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            unsubscribe = () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        } else {
            unsubscribe = NetInfo.addEventListener(state => {
                setIsOnline(!!(state.isConnected && state.isInternetReachable));
            });
        }

        checkCachedSession();

        return () => unsubscribe();
    }, []);

    const checkCachedSession = async () => {
        try {
            let cachedUser: string | null = null;
            if (Platform.OS === 'web') {
                cachedUser = localStorage.getItem('cached_user');
            } else {
                cachedUser = await SecureStore.getItemAsync('cached_user');
            }

            if (cachedUser) {
                const raw = JSON.parse(cachedUser);

                // Restore Supabase session if tokens are present
                if (raw.token && raw.refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token: raw.token,
                        refresh_token: raw.refresh_token,
                    });
                    if (error) {
                        console.log('⚠️ Failed to restore Supabase session from cache:', error.message);
                    } else {
                        console.log('✅ Supabase session restored from cache');
                    }
                }

                // Map flat cache object to app structure expected by UI { user: {...}, staff: {...} }
                const mappedUser = {
                    user: {
                        id: raw.user_id,
                        email: raw.email,
                    },
                    staff: {
                        id: raw.staff_id,
                        role: raw.role,
                        full_name: raw.full_name,
                        phone: raw.phone,
                    }
                };
                setUser(mappedUser);
            }
        } catch (error) {
            console.error('Failed to load cached session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            let result;
            if (isOnline) {
                try {
                    result = await authService.loginOnline(credentials);

                    // Trigger initial farmer sync after successful online login
                    try {
                        const { farmerSyncService } = await import('../services/farmer.sync.service');
                        await farmerSyncService.syncAllFarmers(result.staff.id);
                        console.log('Initial farmer sync completed');
                    } catch (syncError) {
                        // Don't fail login if sync fails - it will retry on next connection
                        console.warn('Initial farmer sync failed, will retry later:', syncError);
                    }
                } catch (error: any) {
                    // If online login fails due to network error, try offline
                    if (
                        error.message?.includes('Network request failed') ||
                        error.message?.includes('Failed to fetch') ||
                        error.name === 'AuthRetryableFetchError'
                    ) {
                        console.log('Online login failed with network error, attempting offline login...');
                        result = await authService.loginOffline(credentials);
                    } else {
                        throw error;
                    }
                }
            } else {
                result = await authService.loginOffline(credentials);
            }
            setUser(result);
            return result;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        if (isOnline) {
            await supabase.auth.signOut();
        }
        if (Platform.OS === 'web') {
            localStorage.removeItem('cached_user');
        } else {
            await SecureStore.deleteItemAsync('cached_user');
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isOnline, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
