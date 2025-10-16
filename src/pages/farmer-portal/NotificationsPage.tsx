import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  Clock,
  DollarSign,
  Milk
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch notifications
        const { data: notificationsData, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(notificationsData || []);
        setFilteredNotifications(notificationsData || []);
        
        // Count unread notifications
        const unread = notificationsData?.filter(n => !n.read).length || 0;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        toast.error('Error', 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Filter notifications based on category
  useEffect(() => {
    if (categoryFilter === "all") {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => n.category === categoryFilter));
    }
  }, [categoryFilter, notifications]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => prev > 0 ? prev - 1 : 0);
      toast.success('Success', 'Notification marked as read');
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Error', 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Success', 'All notifications marked as read');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Error', 'Failed to mark all notifications as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'collection':
        return <Milk className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with important alerts and announcements"
        actions={
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All as Read
            </Button>
          </div>
        }
      />

      {/* Category Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              onClick={() => setCategoryFilter("all")}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              All
            </Button>
            <Button
              variant={categoryFilter === "payment" ? "default" : "outline"}
              onClick={() => setCategoryFilter("payment")}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Payments
            </Button>
            <Button
              variant={categoryFilter === "collection" ? "default" : "outline"}
              onClick={() => setCategoryFilter("collection")}
              className="flex items-center gap-2"
            >
              <Milk className="h-4 w-4" />
              Collections
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            {getCategoryIcon(notification.category)}
                            {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;