import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SimplifiedAuthContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface VarianceNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const VarianceNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<VarianceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up real-time subscription
      const channel = supabase
        .channel('variance-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Add new notification to the list
            const newNotification = payload.new as VarianceNotification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Show toast notification
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 10000
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'variance')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('category', 'variance')
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            Variance Alerts {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 border-b border-gray-100 ${!notification.read ? 'bg-yellow-50' : ''}`}
            >
              <div className="flex justify-between">
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        
        {notifications.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No variance alerts
          </div>
        )}
      </div>
    </div>
  );
};

export default VarianceNotificationBanner;