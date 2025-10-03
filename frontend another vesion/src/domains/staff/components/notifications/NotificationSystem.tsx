import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Settings, 
  Trash2, 
  Eye, 
  EyeOff,
  Wifi,
  WifiOff,
  RotateCcw
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Switch 
} from '@/components/ui/switch';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Slider 
} from '@/components/ui/slider';
import { 
  Separator 
} from '@/components/ui/separator';
import { 
  ScrollArea 
} from '@/components/ui/scroll-area';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { Notification } from '@/types/notification';
import { formatDistanceToNow, parseISO } from 'date-fns';

const NotificationSystem: React.FC = () => {
  const {
    notifications,
    unreadCount,
    connectionStatus,
    preferences,
    isLoading,
    error,
    isConnected,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    deleteNotification,
    deleteAllRead,
    refetch,
    sendWebSocketMessage,
    reconnectWebSocket
  } = useNotificationSystem();

  const [showAll, setShowAll] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(preferences);

  // Update local preferences when they change
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  // Filter notifications based on showAll state
  const filteredNotifications = showAll 
    ? notifications 
    : notifications.filter(n => !n.read);

  // Handle preference changes
  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    if (localPreferences) {
      setLocalPreferences({
        ...localPreferences,
        [key]: value
      });
    }
  };

  // Save preferences
  const savePreferences = () => {
    if (localPreferences) {
      updatePreferences({ preferences: localPreferences });
      setIsPreferencesOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Delete all read notifications
  const handleDeleteAllRead = () => {
    if (window.confirm('Are you sure you want to delete all read notifications?')) {
      deleteAllRead();
    }
  };

  // Render connection status indicator
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center text-green-600">
            <Wifi className="h-4 w-4 mr-1" />
            <span className="text-xs">Connected</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center text-red-600">
            <WifiOff className="h-4 w-4 mr-1" />
            <span className="text-xs">Disconnected</span>
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center text-yellow-600">
            <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
            <span className="text-xs">Reconnecting</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: Notification) => {
    const timeAgo = formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true });
    
    return (
      <div 
        key={notification.id} 
        className={`p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
          !notification.read ? 'bg-muted/30' : ''
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h4 className="font-medium text-sm truncate">{notification.title}</h4>
              {!notification.read && (
                <Badge variant="default" className="ml-2 h-2 w-2 p-0">
                  <span className="sr-only">Unread</span>
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              {notification.priority === 'high' && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  High Priority
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => markAsRead(notification.id)}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Mark as read</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => deleteNotification(notification.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render preferences dialog
  const renderPreferencesDialog = () => {
    if (!localPreferences) return null;

    return (
      <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Customize how you receive and view notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch
                  id="email-notifications"
                  checked={localPreferences.email_notifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('email_notifications', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <Switch
                  id="sms-notifications"
                  checked={localPreferences.sms_notifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('sms_notifications', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={localPreferences.push_notifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('push_notifications', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-enabled">Notification Sound</Label>
                <Switch
                  id="sound-enabled"
                  checked={localPreferences.sound_enabled}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('sound_enabled', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-toasts">Toast Notifications</Label>
                <Switch
                  id="enable-toasts"
                  checked={localPreferences.enable_toasts}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('enable_toasts', checked)
                  }
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Auto-dismiss Duration: {localPreferences.auto_dismiss_duration} seconds</Label>
              <Slider
                min={1}
                max={30}
                step={1}
                value={[localPreferences.auto_dismiss_duration]}
                onValueChange={(value) => 
                  handlePreferenceChange('auto_dismiss_duration', value[0])
                }
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsPreferencesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePreferences}>Save Preferences</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {unreadCount > 0 ? (
              <>
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              </>
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="end"
          sideOffset={8}
        >
          <div className="border-b p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {renderConnectionStatus()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsPreferencesOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unread Only
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show All
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={handleMarkAllAsRead}
                  disabled={filteredNotifications.filter(n => !n.read).length === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={handleDeleteAllRead}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-destructive">Failed to load notifications</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h4 className="font-medium mt-2">No notifications</h4>
              <p className="text-sm text-muted-foreground">
                {showAll 
                  ? "You don't have any notifications yet." 
                  : "You're all caught up! No unread notifications."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              {filteredNotifications.map(renderNotificationItem)}
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
      
      {renderPreferencesDialog()}
    </>
  );
};

export default NotificationSystem;