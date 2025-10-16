import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id?: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  created_at?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private subscription: any;
  private listeners: Set<(notification: Notification) => void> = new Set();
  // Map of adminId -> channel for admin-specific subscriptions
  private adminChannels: Map<string, any> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.requestNotificationPermission();
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          read: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Send a notification to all admins
   */
  async sendAdminNotification(title: string, message: string, category: string = 'kyc'): Promise<void> {
    try {
      // Get all admin user IDs
      const { data: admins, error: adminsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .eq('active', true);

      if (adminsError) throw adminsError;

      if (!admins || admins.length === 0) return;

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        title,
        message,
        type: 'admin',
        category,
        read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  /**
   * Send a system-wide notification to all users
   */
  async sendSystemNotification(title: string, message: string, category: string = 'system'): Promise<void> {
    try {
      // Get all user IDs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      if (usersError) throw usersError;

      if (!users || users.length === 0) return;

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        title,
        message,
        type: 'system',
        category,
        read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error sending system notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to admin-specific notifications
   */
  async subscribeToAdminNotifications(adminId: string) {
    try {
      // Subscribe to admin notifications channel
      const adminChannel = supabase.channel(`admin-notifications-${adminId}`);

      // Listen for critical system events
      adminChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'system_events',
            filter: `severity=in.(high,critical)`
          },
          (payload) => {
            this.handleCriticalEvent(payload.new);
          }
        )
        // Listen for security events
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'security_events'
          },
          (payload) => {
            this.handleSecurityEvent(payload.new);
          }
        )
        // Listen for KYC events
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kyc_events'
          },
          (payload) => {
            this.handleKYCEvent(payload.new);
          }
        )
        .subscribe();

      // Store the channel for cleanup
      this.adminChannels.set(adminId, adminChannel);
    } catch (error) {
      console.error('Error subscribing to admin notifications:', error);
      throw error;
    }
  }

  private async handleCriticalEvent(event: any) {
    await this.sendAdminNotification(
      'Critical System Event',
      `${event.message}\nSeverity: ${event.severity}\nAction Required: ${event.action_required || 'Review immediately'}`,
      'critical'
    );
  }

  private async handleSecurityEvent(event: any) {
    await this.sendAdminNotification(
      'Security Alert',
      `Security event detected: ${event.event_type}\nDetails: ${JSON.stringify(event.data)}`,
      'security'
    );
  }

  private async handleKYCEvent(event: any) {
    await this.sendAdminNotification(
      'KYC Update',
      `KYC event: ${event.event_type}\nFarmer: ${event.farmer_name}\nStatus: ${event.status}`,
      'kyc'
    );
  }

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  async subscribeToNotifications(userId: string) {
    this.subscription = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.notifyListeners(payload.new as Notification);
          this.showBrowserNotification(payload.new as Notification);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(callback: (notification: Notification) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(notification: Notification) {
    this.listeners.forEach(listener => listener(notification));
  }

  private async requestNotificationPermission() {
    if (!("Notification" in window)) return;
    
    if (Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  }

  private showBrowserNotification(notification: Notification) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
        tag: notification.id
      });
    }
  }

  /**
   * Clean up subscriptions
   */
  cleanup() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
    // remove any admin channels as well
    if (this.adminChannels && this.adminChannels.size > 0) {
      for (const ch of this.adminChannels.values()) {
        try {
          supabase.removeChannel(ch);
        } catch (e) {
          console.warn('Failed to remove admin channel', e);
        }
      }
      this.adminChannels.clear();
    }

    this.listeners.clear();
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
  }
}

export const notificationService = NotificationService.getInstance();