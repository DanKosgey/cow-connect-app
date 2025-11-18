import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Milk,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';

interface SecurityAlert {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  created_at: string;
  read: boolean;
}

const SecurityAlertsDashboard: React.FC = () => {
  const { show } = useToastNotifications();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    setupRealtimeSubscription();
    
    return () => {
      // Clean up realtime subscription
      const channel = supabase.channel('security_alerts');
      supabase.removeChannel(channel);
    };
  }, []);

  const setupRealtimeSubscription = () => {
    // Listen for new security alerts in real-time
    const channel = supabase.channel('security_alerts');
    
    channel.on(
      'broadcast',
      { event: 'security_alert' },
      (payload) => {
        // Add the new alert to the list
        const newAlert: SecurityAlert = {
          id: `rt_${Date.now()}`,
          user_id: 'admin',
          title: `Real-time Alert: ${payload.payload.activityType}`,
          message: `Type: ${payload.payload.activityType}\nStaff: ${payload.payload.staffId || 'Unknown'}\nCollection: ${payload.payload.collectionId || 'Unknown'}\nDetails: ${JSON.stringify(payload.payload.details)}`,
          type: 'warning',
          category: 'security_alert',
          created_at: payload.payload.timestamp,
          read: false
        };
        
        setAlerts(prev => [newAlert, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        show({
          title: 'Security Alert',
          description: `New suspicious activity detected: ${payload.payload.activityType}`,
          variant: 'destructive'
        });
      }
    ).subscribe();
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'security_alert')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAlerts(data || []);
      setUnreadCount((data || []).filter(alert => !alert.read).length);
    } catch (error: any) {
      console.error('Error fetching security alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('category', 'security_alert')
        .eq('read', false);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => ({ ...alert, read: true }))
      );
      
      setUnreadCount(0);
      
      show({
        title: 'Success',
        description: 'All alerts marked as read'
      });
    } catch (error: any) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Alerts</h1>
          <p className="text-muted-foreground">Monitor suspicious activities and security alerts</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={fetchAlerts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead}>
              Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No security alerts</h3>
              <p className="text-gray-500">All systems are secure</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Alert 
                  key={alert.id} 
                  className={`${getAlertColor(alert.type)} ${!alert.read ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {!alert.read && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <AlertDescription className="mt-1 whitespace-pre-wrap">
                        {alert.message}
                      </AlertDescription>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>User ID: {alert.user_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Milk className="h-3 w-3" />
                          <span>Category: {alert.category}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAlertsDashboard;