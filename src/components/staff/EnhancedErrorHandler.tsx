import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  XCircle, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Database,
  User,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SystemStatus {
  database: 'online' | 'offline' | 'degraded';
  authentication: 'online' | 'offline' | 'degraded';
  network: 'online' | 'offline' | 'degraded';
  lastChecked: Date;
}

interface ErrorLog {
  id: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  stack?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export default function EnhancedErrorHandler() {
  const { show, error: showError } = useToastNotifications();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    authentication: 'online',
    network: 'online',
    lastChecked: new Date()
  });
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadErrorLogs();
    checkSystemStatus();
    
    // Check system status every 5 minutes
    const interval = setInterval(checkSystemStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadErrorLogs = async () => {
    try {
      // In a real implementation, this would fetch from a database table
      // For now, we'll simulate with sample data
      const sampleLogs: ErrorLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          type: 'error',
          component: 'EnhancedCollectionForm',
          message: 'Failed to capture GPS location',
          resolved: false
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          type: 'warning',
          component: 'EnhancedPaymentApproval',
          message: 'Slow response from payment service',
          resolved: true,
          resolvedAt: new Date(Date.now() - 43200000), // 12 hours ago
          resolvedBy: 'System Auto-Recovery'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 172800000), // 2 days ago
          type: 'info',
          component: 'EnhancedFarmerDirectory',
          message: 'New farmer added to system',
          resolved: true,
          resolvedAt: new Date(Date.now() - 172800000) // 2 days ago
        }
      ];
      
      setErrorLogs(sampleLogs);
    } catch (error) {
      console.error('Error loading error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    setCheckingStatus(true);
    
    try {
      // Check database connectivity
      const { data: dbData, error: dbError } = await supabase
        .from('collections')
        .select('id')
        .limit(1);
      
      const databaseStatus = dbError ? 'offline' : 'online';
      
      // Check authentication
      const { data: authData } = await supabase.auth.getUser();
      const authStatus = authData?.user ? 'online' : 'offline';
      
      // Network status is determined by browser
      const networkStatus = navigator.onLine ? 'online' : 'offline';
      
      setSystemStatus({
        database: databaseStatus,
        authentication: authStatus,
        network: networkStatus,
        lastChecked: new Date()
      });
      
      // Show notification if any service is degraded/offline
      if (databaseStatus !== 'online' || authStatus !== 'online' || networkStatus !== 'online') {
        showError(
          'System Alert', 
          'One or more services are experiencing issues. Please check the system status.'
        );
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      setSystemStatus({
        database: 'offline',
        authentication: 'offline',
        network: 'offline',
        lastChecked: new Date()
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      // In a real implementation, this would update the database
      setErrorLogs(prev => prev.map(log => 
        log.id === errorId 
          ? { ...log, resolved: true, resolvedAt: new Date(), resolvedBy: 'Manual Resolution' } 
          : log
      ));
      
      show({
        title: 'Error Resolved',
        description: 'The error has been marked as resolved'
      });
    } catch (error) {
      showError('Error', 'Failed to resolve the error');
    }
  };

  const clearResolvedErrors = () => {
    setErrorLogs(prev => prev.filter(log => !log.resolved));
    show({
      title: 'Cleaned Up',
      description: 'Resolved errors have been cleared'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'offline': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health and error logs
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            onClick={checkSystemStatus}
            disabled={checkingStatus}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Database</h3>
                  <p className="text-sm text-muted-foreground">Supabase Connection</p>
                </div>
              </div>
              <Badge className={getStatusColor(systemStatus.database)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(systemStatus.database)}
                  {systemStatus.database.charAt(0).toUpperCase() + systemStatus.database.slice(1)}
                </div>
              </Badge>
            </div>

            {/* Authentication Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Authentication</h3>
                  <p className="text-sm text-muted-foreground">User Sessions</p>
                </div>
              </div>
              <Badge className={getStatusColor(systemStatus.authentication)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(systemStatus.authentication)}
                  {systemStatus.authentication.charAt(0).toUpperCase() + systemStatus.authentication.slice(1)}
                </div>
              </Badge>
            </div>

            {/* Network Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {navigator.onLine ? (
                  <Wifi className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <WifiOff className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <h3 className="font-medium">Network</h3>
                  <p className="text-sm text-muted-foreground">Internet Connection</p>
                </div>
              </div>
              <Badge className={getStatusColor(systemStatus.network)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(systemStatus.network)}
                  {systemStatus.network.charAt(0).toUpperCase() + systemStatus.network.slice(1)}
                </div>
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground text-right">
            Last checked: {formatDistanceToNow(systemStatus.lastChecked, { addSuffix: true })}
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Logs
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearResolvedErrors}
              disabled={!errorLogs.some(log => log.resolved)}
            >
              Clear Resolved
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {errorLogs.length > 0 ? (
            <div className="space-y-3">
              {errorLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-4 border rounded-lg ${getLogTypeColor(log.type)} ${
                    log.resolved ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getLogTypeIcon(log.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{log.component}</h3>
                          <Badge variant={log.resolved ? "secondary" : "default"}>
                            {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                          </Badge>
                          {log.resolved && (
                            <Badge variant="outline">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm">{log.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(log.timestamp, 'MMM d, yyyy h:mm a')}
                          </div>
                          {!log.resolved && (
                            <span className="text-red-500">Requires attention</span>
                          )}
                          {log.resolved && log.resolvedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Resolved {formatDistanceToNow(log.resolvedAt, { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!log.resolved && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => resolveError(log.id)}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p>No errors or warnings to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Troubleshooting Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Database Issues</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Check your internet connection</li>
                <li>• Verify Supabase service status</li>
                <li>• Contact system administrator if issues persist</li>
              </ul>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Authentication Problems</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Try logging out and back in</li>
                <li>• Clear browser cache and cookies</li>
                <li>• Check your account permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}