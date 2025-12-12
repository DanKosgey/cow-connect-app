import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notification-service';
import { useAuth } from '@/hooks/useAuth';
import RefreshButton from '@/components/ui/RefreshButton';

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: string;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(user.id, 100);
      const mapped = (data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        timestamp: n.created_at || new Date().toISOString(),
        read: n.read,
        type: n.type || 'info'
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error('Error fetching admin notifications', err);
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let subscription: any | null = null;

    fetchNotifications();

    if (user) {
      try {
        subscription = supabase
          .channel(`admin_notifications:${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: any) => {
            const p: any = payload;
            const ev = p.eventType || p.event || p.type || p.event_type;
            const newRecord = p.new as any;
            const oldRecord = p.old as any;

            setNotifications(prev => {
              if (ev === 'INSERT' || ev === 'insert') {
                const item = {
                  id: newRecord?.id,
                  title: newRecord?.title,
                  message: newRecord?.message,
                  timestamp: newRecord?.created_at || new Date().toISOString(),
                  read: newRecord?.read || false,
                  type: newRecord?.type || 'info'
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
        console.warn('Failed to subscribe admin notifications', err);
      }
    }

    return () => {
      if (subscription) {
        try { supabase.removeChannel(subscription); } catch (e) { }
      }
    };
  }, [user, toast]);

  const markAsRead = async (id: string) => {
    try {
      const ok = await notificationService.markAsRead(id);
      if (ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read', err);
      toast({ title: 'Error', description: 'Failed to mark notification', variant: 'error' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const ok = await notificationService.deleteNotification(id);
      if (ok) setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification', err);
      toast({ title: 'Error', description: 'Failed to delete notification', variant: 'error' });
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={fetchNotifications} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && notifications.length === 0 && <div>No notifications</div>}
          {!loading && notifications.map(n => (
            <div key={n.id} className="p-3 border-b last:border-b-0 flex items-start justify-between">
              <div>
                <div className="font-medium">{n.title} { !n.read && <Badge>New</Badge> }</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
                <div className="text-xs text-muted-foreground">{format(parseISO(n.timestamp), 'PPpp')}</div>
              </div>
              <div className="flex gap-2">
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Mark as read</Button>}
                <Button size="sm" variant="destructive" onClick={() => deleteNotification(n.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}