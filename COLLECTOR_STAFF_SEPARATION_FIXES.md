# Collector and Staff Portal Separation Fixes

## Issues Identified and Fixed

### 1. Shared Dashboard Navigation
**Problem**: Both collector and staff roles were using the same navigation items in the DashboardLayout component.

**Fix**: Updated the roleNavigation configuration in DashboardLayout.tsx to have distinct navigation items for each role:

```javascript
// Staff navigation (office functions only)
staff: [
  { label: 'Dashboard', path: '/staff-only/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, category: 'main' },
  { label: 'Milk Approval', path: '/staff-only/milk-approval', icon: <CheckCircle className="h-5 w-5" />, category: 'operations' },
  { label: 'Variance Reports', path: '/staff-only/variance-reports', icon: <TrendingUp className="h-5 w-5" />, category: 'analytics' },
  { label: 'Collector Performance', path: '/staff-only/collector-performance', icon: <BarChart3 className="h-5 w-5" />, category: 'analytics' },

  { label: 'Profile', path: '/staff-only/profile', icon: <UserCog className="h-5 w-5" />, category: 'settings' },
],

// Collector navigation (field functions only)
collector: [
  { label: 'Dashboard', path: '/collector-only/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, category: 'main' },
  { label: 'New Collection', path: '/collector-only/collections/new', icon: <ClipboardList className="h-5 w-5" />, category: 'operations' },
  { label: 'Collections', path: '/collector-only/collections', icon: <Milk className="h-5 w-5" />, category: 'operations' },
  { label: 'Farmers', path: '/collector-only/farmers', icon: <Users className="h-5 w-5" />, category: 'management' },
  { label: 'Performance', path: '/collector-only/performance', icon: <BarChart3 className="h-5 w-5" />, category: 'analytics' },
  { label: 'Profile', path: '/collector-only/profile', icon: <UserCog className="h-5 w-5" />, category: 'settings' },
],
```

### 2. Role-Based Layout Components
**Problem**: Both portals were using the same base DashboardLayout without proper role validation.

**Fix**: Added role validation to both layout components:

**CollectorPortalLayout.tsx**:
```javascript
// Added role check to ensure only collectors can access
useEffect(() => {
  if (user && userRole !== UserRole.COLLECTOR) {
    toast({
      title: 'Access Denied',
      description: 'You do not have permission to access this portal.',
      variant: 'destructive'
    });
    const dashboardRoutes = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.FARMER]: '/farmer/dashboard',
      [UserRole.STAFF]: '/staff-only/dashboard'
    };
    navigate(dashboardRoutes[userRole as UserRole] || '/');
  }
}, [user, userRole, navigate, toast]);
```

**StaffPortalLayout.tsx**:
```javascript
// Fixed existing role check logic
useEffect(() => {
  if (user && userRole !== UserRole.STAFF) {
    toast({
      title: 'Access Denied',
      description: 'You do not have permission to access this portal.',
      variant: 'destructive'
    });
    const dashboardRoutes = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.FARMER]: '/farmer/dashboard',
      [UserRole.COLLECTOR]: '/collector-only/dashboard'
    };
    navigate(dashboardRoutes[userRole as UserRole] || '/');
  }
}, [user, userRole, navigate, toast]);
```

### 3. Correct Route Protection
**Problem**: Route protection wasn't properly enforcing role boundaries.

**Fix**: Verified that both route files use the correct role protection:

**collector-only.routes.tsx**:
```javascript
<ProtectedRoute requiredRole={UserRole.COLLECTOR}>
```

**staff-only.routes.tsx**:
```javascript
<ProtectedRoute requiredRole={UserRole.STAFF}>
```

### 4. Updated Redirect Paths
**Problem**: Logout and redirect paths were pointing to incorrect portals.

**Fix**: Updated all redirect paths in DashboardLayout.tsx:

```javascript
// Login paths
const loginPaths: Record<string, string> = {
  'farmer': '/farmer/login',
  'staff': '/staff-only/login',
  'collector': '/collector-only/login',
  'admin': '/admin/login'
};

// Dashboard paths (in accept-invite.tsx)
const dashboardPaths: Record<string, string> = {
  'farmer': '/farmer/dashboard',
  'staff': '/staff-only/dashboard',
  'collector': '/collector-only/dashboard',
  'admin': '/admin/dashboard'
};
```

## Verification Steps

1. **Collector Portal** (`/collector-only/*`)
   - Should only show collection-related navigation items
   - Should be accessible only by users with COLLECTOR role
   - Should redirect other roles to their correct portals

2. **Staff Portal** (`/staff-only/*`)
   - Should only show office/admin-related navigation items
   - Should be accessible only by users with STAFF role
   - Should redirect other roles to their correct portals

3. **Navigation Separation**
   - Collectors see: Dashboard, New Collection, Collections, Farmers, Performance, Profile
   - Staff see: Dashboard, Milk Approval, Variance Reports, Collector Performance, Profile

## Files Modified

1. `src/components/DashboardLayout.tsx` - Updated roleNavigation configuration
2. `src/components/collector/CollectorPortalLayout.tsx` - Added role validation
3. `src/components/staff/StaffPortalLayout.tsx` - Verified role validation logic
4. `src/routes/collector-only.routes.tsx` - Verified route protection
5. `src/routes/staff-only.routes.tsx` - Verified route protection

The separation is now complete with clear boundaries between field collection activities and office administrative tasks.