import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useToastNotifications from './useToastNotifications';
import { notificationService, Notification } from '@/services/notification-service';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

interface UseNotificationSystemProps {
  initialPage?: number;
  refetchInterval?: number;
  enableToasts?: boolean;
  enableSound?: boolean;
}

// Simplified types since we don't have the full type definitions
interface NotificationPreferences {
  sound_enabled?: boolean;
  enable_toasts?: boolean;
  auto_dismiss_duration?: number;
}

interface WebSocketNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  created_at: string;
}

interface NotificationReadEvent {
  notification_id: string;
}

interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  pagination?: any;
}

export const useNotificationSystem = ({
  initialPage = 1,
  refetchInterval = 30000, // 30 seconds
  enableToasts = true,
  enableSound = true
}: UseNotificationSystemProps = {}) => {
  const queryClient = useQueryClient();
  const { show, error: showError } = useToastNotifications();
  const { user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch notifications with pagination
  const { data, isLoading, error, refetch } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', page],
    queryFn: async () => {
      if (!user?.id) {
        return { notifications: [], unread_count: 0 };
      }
      
      const notifications = await notificationService.getUserNotifications(user.id, 20);
      const unreadCount = await notificationService.getUnreadCount(user.id);
      
      return {
        notifications,
        unread_count: unreadCount
      };
    },
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Update unread count when notifications load
  useEffect(() => {
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count);
    }
  }, [data]);

  // Handle new notification (simplified without WebSocket)
  const handleNewNotification = useCallback((notification: WebSocketNotification) => {
    // Play sound if enabled
    if (enableSound && preferences?.sound_enabled) {
      console.log('Playing notification sound');
    }

    // Show toast if enabled
    if (enableToasts && preferences?.enable_toasts) {
      showToastNotification(notification);
    }

    // Update unread count
    setUnreadCount(prev => prev + 1);

    // Invalidate and refetch notifications
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [enableSound, enableToasts, preferences]);

  // Handle notification read event (simplified without WebSocket)
  const handleNotificationRead = useCallback((readEvent: NotificationReadEvent) => {
    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Invalidate and refetch notifications
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, []);

  // Show toast notification
  const showToastNotification = useCallback((notification: WebSocketNotification) => {
    const duration = (preferences?.auto_dismiss_duration || 5) * 1000;
    
    // Map notification types to toast variants
    const variant = notification.type === 'error' ? 'destructive' : 'default';
    
    // Map to new toast API
    if (variant === 'destructive') {
      showError(notification.title, notification.message);
    } else {
      show({ title: notification.title, description: notification.message });
    }
  }, [preferences, show, showError]);

  // Mark notification as read mutation
  const { mutate: markAsRead, isPending: isMarkingAsRead } = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
    }
  });

  // Mark all notifications as read mutation
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } = useMutation({
    mutationFn: () => {
      if (!user?.id) return Promise.reject('No user ID');
      return notificationService.markAllAsRead(user.id);
    },
    onSuccess: () => {
      // Reset unread count
      setUnreadCount(0);
      
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error);
    }
  });

  // Delete notification mutation
  const { mutate: deleteNotification, isPending: isDeletingNotification } = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to delete notification:', error);
    }
  });

  // Change page
  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    // Data
    notifications: data?.notifications || [],
    pagination: data?.pagination,
    unreadCount,
    connectionStatus,
    preferences,
    isLoading,
    error,
    
    // Mutations
    markAsRead,
    isMarkingAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
    deleteNotification,
    isDeletingNotification,
    
    // Actions
    refetch,
    changePage,
  };
};