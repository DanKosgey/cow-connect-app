import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  Trash2,
  Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notification-service';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

const StaffNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any | null = null;

    const fetchNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await notificationService.getUserNotifications(user.id, 50);
        // Map to local shape if needed (some fields may differ)
        const mapped = (data || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.created_at || new Date().toISOString(),
          read: n.read,
          type: (n.type === 'system' ? 'info' : 'info') as any
        }));

        setNotifications(mapped || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        toast({ title: 'Error', description: 'Failed to load notifications', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications for this user
    if (user) {
      try {
        subscription = supabase
          .channel(`notifications:${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: any) => {
            // Treat payload as any to avoid strict typings from Realtime lib
            const p: any = payload;
            const newRecord = p.new as any;
            const oldRecord = p.old as any;
            const ev = p.eventType || p.event || p.type || p.event_type;

            setNotifications(prev => {
              if (ev === 'INSERT' || ev === 'insert') {
                const item = {
                  id: newRecord?.id,
                  title: newRecord?.title,
                  message: newRecord?.message,
                  timestamp: newRecord?.created_at || new Date().toISOString(),
                  read: newRecord?.read || false,
                  type: newRecord?.type === 'system' ? 'info' : 'info'
                } as Notification;
                return [item, ...prev];
              }

              if (ev === 'UPDATE' || ev === 'update') {
                return prev.map(n => n.id === newRecord?.id ? { ...n, title: newRecord?.title, message: newRecord?.message, read: newRecord?.read } : n);
              }

              if (ev === 'DELETE' || ev === 'delete') {
                return prev.filter(n => n.id !== oldRecord?.id);
              }

              return prev;
            });
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription failed for notifications:', err);
      }
    }

    return () => {
      if (subscription) {
        try { supabase.removeChannel(subscription); } catch (e) { /* ignore */ }
      }
    };
  }, [user, toast]);

  const markAsRead = async (id: string) => {
    try {
      const ok = await notificationService.markAsRead(id);
      if (ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        toast({ title: 'Success', description: 'Notification marked as read', variant: 'success' });
      }
    } catch (err) {
      console.error('Error marking notification as read', err);
      toast({ title: 'Error', description: 'Failed to mark notification', variant: 'error' });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const ok = await notificationService.markAllAsRead(user.id);
      if (ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast({ title: 'Success', description: 'All notifications marked as read', variant: 'success' });
      }
    } catch (err) {
      console.error('Error marking all as read', err);
      toast({ title: 'Error', description: 'Failed to mark all notifications', variant: 'error' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const ok = await notificationService.deleteNotification(id);
      if (ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: 'Success', description: 'Notification deleted', variant: 'success' });
      }
    } catch (err) {
      console.error('Error deleting notification', err);
      toast({ title: 'Error', description: 'Failed to delete notification', variant: 'error' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-green-500';
      case 'warning': return 'border-l-yellow-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-blue-500';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` 
              : 'All notifications are read'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`border-l-4 ${getTypeColor(notification.type)} ${!notification.read ? 'bg-muted/50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(parseISO(notification.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{notification.message}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StaffNotifications;