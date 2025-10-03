import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { secureStorage } from '@/domains/auth/utils/secureStorage';

interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  farm_details?: any;
  is_active: boolean;
}

interface UserDataContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const useUserData = (): UserDataContextType => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const currentUser = await secureStorage.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('User refresh failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const value: UserDataContextType = {
    user,
    loading,
    refreshUser,
    hasRole,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};