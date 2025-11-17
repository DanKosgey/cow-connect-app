# Complete Authentication System with Role-Based Access Control (RBAC)

## Overview

This document explains how to create a complete authentication system with role-based access control using Supabase. The system includes database setup, Row Level Security (RLS) policies, and client-side implementation.

## Step 1: Database Setup

First, set up your database tables in Supabase SQL Editor:

```sql
-- Create an enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');

-- Create a profiles table that extends auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 2: Helper Functions for Role Checking

```sql
-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role or higher
CREATE OR REPLACE FUNCTION public.has_role_or_higher(required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_level INTEGER;
  required_role_level INTEGER;
BEGIN
  -- Define role hierarchy (higher number = more privileges)
  SELECT CASE role
    WHEN 'admin' THEN 3
    WHEN 'moderator' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END INTO user_role_level
  FROM public.profiles
  WHERE id = auth.uid();
  
  required_role_level := CASE required_role
    WHEN 'admin' THEN 3
    WHEN 'moderator' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;
  
  RETURN user_role_level >= required_role_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 3: Client-Side Implementation

### Supabase Auth Service

```typescript
// authService.ts
import { createClient } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'moderator' | 'user'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export class AuthService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Sign in user
  static async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    // Check if user has required role
    const profile = await this.getProfile(data.user.id)
    if (!profile) {
      throw new Error('User profile not found')
    }
    
    return { user: data.user, profile }
  }

  // Sign up user
  static async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  // Get user profile
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (error) return null
    return data
  }

  // Check if user has specific role
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('has_role', {
      required_role: role
    })
    
    if (error) return false
    return data
  }

  // Check if user has role or higher
  static async hasRoleOrHigher(userId: string, role: UserRole): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('has_role_or_higher', {
      required_role: role
    })
    
    if (error) return false
    return data
  }

  // Update user role (admin only)
  static async updateUserRole(userId: string, newRole: UserRole) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      
    if (error) throw error
    return data
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      
    if (error) throw error
    return data || []
  }

  // Sign out
  static async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }
}
```

### React Hook for Authentication

```typescript
// useAuth.ts
import { useState, useEffect, useContext, createContext } from 'react'
import { AuthService, Profile, UserRole } from './authService'

interface AuthContextType {
  user: any | null
  profile: Profile | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isModerator: boolean
  hasRole: (role: UserRole) => boolean
  hasRoleOrHigher: (role: UserRole) => boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await AuthService.supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const userProfile = await AuthService.getProfile(session.user.id)
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const userProfile = await AuthService.getProfile(session.user.id)
          setProfile(userProfile)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { user, profile } = await AuthService.signIn(email, password)
    setUser(user)
    setProfile(profile)
  }

  const signOut = async () => {
    await AuthService.signOut()
    setUser(null)
    setProfile(null)
  }

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role
  }

  const hasRoleOrHigher = (role: UserRole): boolean => {
    if (!profile) return false
    
    const roleHierarchy: Record<UserRole, number> = {
      'admin': 3,
      'moderator': 2,
      'user': 1
    }
    
    return roleHierarchy[profile.role] >= roleHierarchy[role]
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: hasRole('admin'),
    isModerator: hasRoleOrHigher('moderator'),
    hasRole,
    hasRoleOrHigher,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

## Step 4: React Components

### ProtectedRoute Component

```typescript
// ProtectedRoute.tsx
import { ReactNode } from 'react'
import { useAuth, UserRole } from './useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback = <div>Access Denied</div>
}: ProtectedRouteProps) {
  const { loading, isAuthenticated, hasRoleOrHigher } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Please login to access this page</div>
  }

  if (requiredRole && !hasRoleOrHigher(requiredRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
```

### LoginForm Component

```typescript
// LoginForm.tsx
import { useState } from 'react'
import { AuthService } from './authService'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await AuthService.signIn(email, password)
      // Redirect or update UI
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  )
}
```

### Role-Based Component

```typescript
// RoleBasedComponent.tsx
import { ReactNode } from 'react'
import { useAuth, UserRole } from './useAuth'

interface RoleBasedProps {
  children: ReactNode
  allowedRoles: UserRole[]
}

export function RoleBasedComponent({ children, allowedRoles }: RoleBasedProps) {
  const { profile } = useAuth()

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null
  }

  return <>{children}</>
}
```

### Dashboard Example Component

```typescript
// DashboardExample.tsx
import { useAuth, UserRole } from './useAuth'

export function DashboardExample() {
  const { profile, isAdmin, isModerator } = useAuth()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {profile?.email}</p>
      <p>Your role: {profile?.role}</p>

      {/* Show only to users */}
      <RoleBasedComponent allowedRoles={['user', 'moderator', 'admin']}>
        <div>User Content: Everyone can see this</div>
      </RoleBasedComponent>

      {/* Show only to moderators and admins */}
      {isModerator && (
        <div>
          <h2>Moderator Panel</h2>
          <p>Moderator-specific content</p>
        </div>
      )}

      {/* Show only to admins */}
      {isAdmin && (
        <div>
          <h2>Admin Panel</h2>
          <p>Admin-specific content</p>
        </div>
      )}
    </div>
  )
}
```

### Admin Panel Component

```typescript
// AdminPanel.tsx
import { useEffect, useState } from 'react'
import { AuthService, Profile, UserRole } from './authService'

export function AdminPanel() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await AuthService.getAllUsers()
      setUsers(allUsers)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await AuthService.updateUserRole(userId, newRole)
      await loadUsers() // Reload users
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div>Loading users...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Current Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Main App Component

```typescript
// App.tsx
import { AuthProvider } from './useAuth'
import { AppContent } from './AppContent'

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

// AppContent.tsx
import { useAuth } from './useAuth'
import { LoginForm } from './LoginForm'
import { DashboardExample } from './DashboardExample'
import { AdminPanel } from './AdminPanel'
import { ProtectedRoute } from './ProtectedRoute'

export function AppContent() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div>
      <DashboardExample />
      
      {/* Protected admin route */}
      <ProtectedRoute requiredRole="admin">
        <AdminPanel />
      </ProtectedRoute>

      {/* Protected moderator route */}
      <ProtectedRoute requiredRole="moderator">
        <div>Moderator Dashboard</div>
      </ProtectedRoute>
    </div>
  )
}
```

## Step 5: Environment Setup

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 6: Install Dependencies

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

## Key Features Implemented

1. **Database Layer**: Profiles table with RLS policies
2. **Role Hierarchy**: admin > moderator > user
3. **Automatic Profile Creation**: Trigger creates profile on signup
4. **Role Checking Functions**: Both SQL and TypeScript implementations
5. **React Hook**: `useAuth()` for easy role checking in components
6. **Protected Routes**: Component-based route protection
7. **Admin Panel**: User management with role updates

## Security Notes

1. **RLS policies** ensure users can only see/modify what they're allowed to
2. **Role changes** require admin privileges
3. **All database operations** go through Supabase's secure API
4. **Never expose service role key** on client side

## Usage

```typescript
// In your components
const { isAdmin, isModerator, hasRole } = useAuth()

if (isAdmin) {
  // Show admin content
}

if (hasRole('moderator')) {
  // Show moderator content
}
```

This is a production-ready authentication system with role-based access control!