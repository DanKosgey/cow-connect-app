// Real-time Notification System interfaces

export type NotificationType = 'info' | 'warning' | 'error' | 'success';
export type NotificationPriority = 'low' | 'medium' | 'high';
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  expires_at?: string; // ISO date string
  priority: NotificationPriority;
  read: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  sound_enabled: boolean;
  notification_sound: string;
  auto_dismiss_duration: number; // in seconds
  enable_toasts: boolean;
  enable_desktop_notifications: boolean;
}

export interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  preferences: NotificationPreferences;
  connectionStatus: ConnectionStatus;
}

export interface WebSocketNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  expires_at?: string;
  priority: NotificationPriority;
}

export interface WebSocketConnectionStatus {
  status: ConnectionStatus;
  message: string;
}

export interface NotificationReadEvent {
  notification_id: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: import('./farmerManagement').PaginationData;
  unread_count: number;
}

export interface UpdateNotificationPreferencesRequest {
  preferences: Partial<NotificationPreferences>;
}