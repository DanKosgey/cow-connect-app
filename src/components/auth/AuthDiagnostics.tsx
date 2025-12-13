import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Clock,
  User,
  Key
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authEventManager, AuthEventType } from '@/utils/authLogger';
import { formatDistanceToNow } from 'date-fns';

interface AuthEventDisplay {
  id: string;
  type: AuthEventType;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  error?: string;
}

const getEventTypeConfig = (type: AuthEventType) => {
  switch (type) {
    case AuthEventType.LOGIN_SUCCESS:
    case AuthEventType.SIGNUP_SUCCESS:
    case AuthEventType.SESSION_REFRESH:
    case AuthEventType.PASSWORD_RESET_SUCCESS:
      return { icon: CheckCircle, color: 'text-green-500', label: 'Success' };
    case AuthEventType.LOGIN_FAILURE:
    case AuthEventType.SIGNUP_FAILURE:
    case AuthEventType.SESSION_EXPIRED:
      return { icon: XCircle, color: 'text-red-500', label: 'Failure' };
    case AuthEventType.LOGIN_ATTEMPT:
    case AuthEventType.SIGNUP_ATTEMPT:
    case AuthEventType.PASSWORD_RESET_REQUEST:
      return { icon: Clock, color: 'text-yellow-500', label: 'Attempt' };
    default:
      return { icon: Shield, color: 'text-blue-500', label: 'Info' };
  }
};

const AuthDiagnostics: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    isSessionRefreshing, 
    user, 
    session, 
    userRole 
  } = useAuth();
  
  const [events, setEvents] = useState<AuthEventDisplay[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load events on mount
  useEffect(() => {
    const loadEvents = () => {
      const recentEvents = authEventManager.getRecentEvents(50);
      const formattedEvents = recentEvents.map(event => ({
        ...event,
        id: `${event.type}-${event.timestamp}`,
        timestamp: new Date(event.timestamp)
      }));
      setEvents(formattedEvents);
    };

    loadEvents();
    
    // Set up interval to refresh events
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    const recentEvents = authEventManager.getRecentEvents(50);
    const formattedEvents = recentEvents.map(event => ({
      ...event,
      id: `${event.type}-${event.timestamp}`,
      timestamp: new Date(event.timestamp)
    }));
    setEvents(formattedEvents);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportLogs = () => {
    const logs = authEventManager.exportEvents();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    authEventManager.clearEvents();
    setEvents([]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Authentication Diagnostics</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            Export Logs
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Auth Status Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication Status</CardTitle>
            {isAuthenticated ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : isSessionRefreshing ? 'Refreshing session...' : 'Ready'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Info</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {user?.email || 'No user'}
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole || 'No role assigned'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
            <Key className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-muted-foreground">
              {session?.expires_at 
                ? `Expires ${formatDistanceToNow(new Date(session.expires_at * 1000), { addSuffix: true })}`
                : 'No session'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tracked in the last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Authentication Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No authentication events recorded yet
                </div>
              ) : (
                events.map((event) => {
                  const config = getEventTypeConfig(event.type);
                  const Icon = config.icon;
                  
                  return (
                    <div key={event.id} className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {event.type.replace(/_/g, ' ')}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                            </Badge>
                          </div>
                          {event.userEmail && (
                            <p className="text-sm text-muted-foreground">
                              User: {event.userEmail}
                            </p>
                          )}
                          {event.metadata && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <span key={key} className="inline-block mr-2">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                          {event.error && (
                            <div className="flex items-start space-x-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-red-500">
                                {event.error}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDiagnostics;