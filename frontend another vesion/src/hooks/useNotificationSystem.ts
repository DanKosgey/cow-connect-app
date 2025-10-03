import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useToast } from './use-toast';
import { NotificationsAPI } from '@/services/ApiService';
import { 
  Notification, 
  NotificationPreferences, 
  WebSocketNotification, 
  WebSocketConnectionStatus,
  NotificationReadEvent,
  NotificationListResponse
} from '@/types/notification';
import { useAuth } from '@/contexts/AuthContext';

interface UseNotificationSystemProps {
  initialPage?: number;
  refetchInterval?: number;
  enableWebSocket?: boolean;
  enableToasts?: boolean;
  enableSound?: boolean;
}

export const useNotificationSystem = ({
  initialPage = 1,
  refetchInterval = 30000, // 30 seconds
  enableWebSocket = true,
  enableToasts = true,
  enableSound = true
}: UseNotificationSystemProps = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session, user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unreadCountRef = useRef(0);
  unreadCountRef.current = unreadCount;

  // Fetch notifications with pagination
  const { data, isLoading, error, refetch } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', page],
    queryFn: () => NotificationsAPI.list(page, true),
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch notification preferences
  const { data: preferencesData } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: NotificationsAPI.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update preferences when they load
  useEffect(() => {
    if (preferencesData) {
      setPreferences(preferencesData);
    }
  }, [preferencesData]);

  // Update unread count when notifications load
  useEffect(() => {
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count);
    }
  }, [data]);

  // WebSocket connection for real-time notifications with authentication
  const getWsUrl = useCallback(() => {
    if (!user?.id) {
      console.error('No user ID available for WebSocket connection');
      return null;
    }
    
    // Get the current session access token
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      console.error('No access token available for WebSocket connection');
      return null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Include the token as a query parameter
    return `${protocol}//${hostname}${port}/api/v1/ws/notifications/${user.id}?token=${encodeURIComponent(accessToken)}`;
  }, [user?.id, session]);

  const wsUrl = getWsUrl();
  
  const {
    isConnected,
    error: wsError,
    sendMessage
  } = useWebSocket(enableWebSocket ? wsUrl : null, {
    onOpen: () => {
      console.log('Connected to notification system');
      setConnectionStatus('connected');
    },
    onClose: () => {
      console.log('Disconnected from notification system');
      setConnectionStatus('disconnected');
    },
    onError: (error) => {
      console.error('Notification WebSocket error:', error);
      setConnectionStatus('disconnected');
    },
    onMessage: (data: any) => {
      handleWebSocketMessage(data);
    }
  });

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    try {
      if (data.type === 'notification') {
        const notification: WebSocketNotification = data;
        handleNewNotification(notification);
      } else if (data.type === 'notification_read') {
        const readEvent: NotificationReadEvent = data;
        handleNotificationRead(readEvent);
      } else if (data.type === 'connection_status') {
        const status: WebSocketConnectionStatus = data;
        setConnectionStatus(status.status);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, []);

  // Handle new notification
  const handleNewNotification = useCallback((notification: WebSocketNotification) => {
    // Play sound if enabled
    if (enableSound && preferences?.sound_enabled) {
      playNotificationSound();
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

  // Handle notification read event
  const handleNotificationRead = useCallback((readEvent: NotificationReadEvent) => {
    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Invalidate and refetch notifications
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // In a real implementation, you would play an actual sound
      // For now, we'll just log to console
      console.log('Playing notification sound');
      
      // Example of how to play a sound:
      // if (audioRef.current) {
      //   audioRef.current.play();
      // }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Show toast notification
  const showToastNotification = useCallback((notification: WebSocketNotification) => {
    const duration = (preferences?.auto_dismiss_duration || 5) * 1000;
    
    // Map notification types to toast variants
    const variant = notification.type === 'error' ? 'destructive' : 'default';
    
    toast({
      title: notification.title,
      description: notification.message,
      variant: variant,
      duration: duration,
    });
  }, [preferences, toast]);

  // Mark notification as read mutation
  const { mutate: markAsRead, isPending: isMarkingAsRead } = useMutation({
    mutationFn: (id: string) => NotificationsAPI.markAsRead(id),
    onSuccess: (notification) => {
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update the notification in the cache
      queryClient.setQueryData(['notifications', page], (oldData: NotificationListResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        };
      });
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
    }
  });

  // Mark all notifications as read mutation
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } = useMutation({
    mutationFn: NotificationsAPI.markAllAsRead,
    onSuccess: () => {
      // Reset unread count
      setUnreadCount(0);
      
      // Update all notifications in the cache to read
      queryClient.setQueryData(['notifications', page], (oldData: NotificationListResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.map(n => ({ ...n, read: true })),
          unread_count: 0
        };
      });
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error);
    }
  });

  // Update preferences mutation
  const { mutate: updatePreferences, isPending: isUpdatingPreferences } = useMutation({
    mutationFn: NotificationsAPI.updatePreferences,
    onSuccess: (updatedPreferences) => {
      setPreferences(updatedPreferences);
      queryClient.setQueryData(['notification-preferences'], updatedPreferences);
    },
    onError: (error) => {
      console.error('Failed to update notification preferences:', error);
    }
  });

  // Delete notification mutation
  const { mutate: deleteNotification, isPending: isDeletingNotification } = useMutation({
    mutationFn: (id: string) => NotificationsAPI.delete(id),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to delete notification:', error);
    }
  });

  // Delete all read notifications mutation
  const { mutate: deleteAllRead, isPending: isDeletingAllRead } = useMutation({
    mutationFn: NotificationsAPI.deleteAllRead,
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to delete all read notifications:', error);
    }
  });

  // Change page
  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Send WebSocket message
  const sendWebSocketMessage = useCallback((message: any) => {
    if (isConnected) {
      sendMessage(message);
    } else {
      console.warn('WebSocket is not connected. Message not sent.');
    }
  }, [isConnected, sendMessage]);

  // Reconnect WebSocket
  const reconnectWebSocket = useCallback(() => {
    // The useWebSocket hook handles reconnection automatically
    // But we can trigger a manual reconnect if needed
    console.log('Attempting to reconnect WebSocket');
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
    wsError,
    isConnected,
    
    // Mutations
    markAsRead,
    isMarkingAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
    updatePreferences,
    isUpdatingPreferences,
    deleteNotification,
    isDeletingNotification,
    deleteAllRead,
    isDeletingAllRead,
    
    // Actions
    refetch,
    changePage,
    sendWebSocketMessage,
    reconnectWebSocket,
  };
};