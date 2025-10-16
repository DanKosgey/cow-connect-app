# Farmer Portal Logging Guide

This document describes the comprehensive logging implemented throughout the farmer portal to track user activity from login to logout.

## Logging Categories

### 1. Authentication Events
- **Login Attempts**: All login attempts are logged with email and result
- **Login Success/Failure**: Successful and failed logins are tracked
- **Logout Events**: User-initiated and automatic logouts are recorded
- **Session Management**: Session start, end, and timeout events

### 2. Portal Access Events
- **Page Views**: Every page visited by the farmer
- **Navigation**: All navigation actions within the portal
- **Component Mount/Unmount**: Tracking when components are loaded and unloaded

### 3. User Interaction Events
- **Button Clicks**: All significant button interactions
- **Form Submissions**: Form submission attempts and results
- **Data Loading**: Tracking when data is loaded and displayed

### 4. Error Events
- **System Errors**: Any system-level errors that occur
- **Data Loading Errors**: Errors when loading farmer data
- **Network Errors**: Connection and communication errors

## Implementation Details

### Farmer Login Page
The FarmerLogin component logs:
- Component mount/unmount events
- Login attempt initiation
- Login success/failure with details
- Forgot password link clicks
- Sign up link clicks
- Return to home link clicks

### Farmer Dashboard
The FarmerDashboard component logs:
- Component mount/unmount events
- Data loading states
- Dashboard rendering with data summary
- Button clicks (Schedule Collection)
- Navigation to KYC upload

### Dashboard Layout
The DashboardLayout component logs:
- Component mount/unmount events
- Navigation events (back, forward, refresh)
- Menu toggle actions
- Sidebar navigation clicks
- Logout initiation and completion
- Portal access events

### Authentication Context
The SimplifiedAuthContext logs:
- Authentication state changes
- Login process steps
- Logout process steps
- Session validation
- User role verification

## Log Format

All logs follow a consistent format with the following structure:

```
[Timestamp] [Component] [Event] { details }
```

Example:
```
[2025-10-15T10:30:45.123Z] [FarmerLogin] Login attempt started { email: "farmer@example.com" }
```

## Log Data Structure

Each log entry includes:

1. **Timestamp**: ISO format timestamp
2. **Component**: The component where the event occurred
3. **Event**: Description of the event
4. **Details**: Additional context-specific information
5. **User Information**: User ID and role when available
6. **Location**: Current page path when relevant

## Monitoring and Debugging

### Browser Console
All logs are output to the browser console for real-time monitoring during development and debugging.

### Log Categories
Logs are categorized with prefixes:
- `[FarmerLogin]` - Farmer login page events
- `[FarmerDashboard]` - Farmer dashboard events
- `[DashboardLayout]` - Dashboard layout events
- `[AuthContext]` - Authentication context events
- `[PortalAccess]` - Portal access and navigation events
- `[PortalNavigation]` - Navigation-specific events

### Error Tracking
Error events include:
- Error messages
- Stack traces when available
- Context information
- User impact assessment

## Privacy Considerations

### Data Collected
- User ID (UUID)
- User role
- Page paths
- Timestamps
- Action types
- Error messages (no sensitive data)

### Data Not Collected
- Passwords
- Personal identification numbers
- Financial account details
- Private messages
- Document contents

## Performance Impact

Logging is designed to have minimal performance impact:
- Asynchronous logging where possible
- Minimal data serialization
- No blocking operations
- Efficient console output

## Troubleshooting

### Common Log Patterns

1. **Successful Login Flow**:
   ```
   [FarmerLogin] Component mounted
   [FarmerLogin] Login attempt started
   [AuthContext] Login successful
   [FarmerDashboard] Component mounted
   ```

2. **Failed Login Flow**:
   ```
   [FarmerLogin] Component mounted
   [FarmerLogin] Login attempt started
   [AuthContext] Login failed: Invalid credentials
   ```

3. **Logout Flow**:
   ```
   [DashboardLayout] Logout initiated
   [AuthContext] Signing out user
   [AuthContext] Sign out process completed
   [DashboardLayout] Redirecting to login page
   ```

### Debugging Tips

1. **Filter by Component**: Use browser console filters to focus on specific components
2. **Filter by User ID**: Track specific user sessions across components
3. **Monitor for Errors**: Look for "Error" or "Failed" in log messages
4. **Track Navigation**: Follow user path through portal navigation logs

## Future Enhancements

### Planned Improvements
1. **Centralized Logging Service**: Consolidate all logging through a single service
2. **Remote Logging**: Send logs to backend for analysis and monitoring
3. **Log Levels**: Implement different log levels (debug, info, warn, error)
4. **Performance Metrics**: Add timing and performance tracking
5. **User Session Analytics**: Track session duration and user engagement

### Integration Opportunities
1. **Analytics Platforms**: Integrate with Google Analytics or similar platforms
2. **Monitoring Services**: Connect to monitoring services like Sentry or Datadog
3. **Business Intelligence**: Export logs for business analytics and reporting