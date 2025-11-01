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
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import RefreshButton from "@/components/ui/RefreshButton";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";

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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    isMarkingAsRead,
    isMarkingAllAsRead
  } = useNotificationSystem();

  // Filter notifications based on category
  const filteredNotifications = categoryFilter === "all" 
    ? notifications 
    : notifications.filter(n => n.category === categoryFilter);

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Notifications</h3>
          <p className="text-gray-500">Failed to load notifications. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
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
            <RefreshButton 
              isRefreshing={isLoading} 
              onRefresh={refetch} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
            <Button 
              variant="outline" 
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? "Marking..." : "Mark All as Read"}
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
                        disabled={isMarkingAsRead}
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