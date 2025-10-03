import { useState, useEffect, useCallback } from 'react';
import { MessagesAPI } from '@/services/ApiService';
import { Message, SendMessageRequest } from '@/types/farmerManagement';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '@/contexts/AuthContext';

interface UseMessagingProps {
  userId?: string;
}

export const useMessaging = ({ userId }: UseMessagingProps = {}) => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // WebSocket connection for real-time messaging with authentication
  const getWebsocketUrl = useCallback(() => {
    const currentUserId = user?.id || userId;
    if (!currentUserId) {
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
    return `${protocol}//${hostname}${port}/api/v1/ws/notifications/${currentUserId}?token=${encodeURIComponent(accessToken)}`;
  }, [user?.id, userId, session]);

  const websocketUrl = getWebsocketUrl();
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket(websocketUrl, {
    onMessage: (data) => {
      if (data.type === 'message_received') {
        // Add new message to the list
        setMessages(prev => [...prev, data.data]);
        setUnreadCount(prev => prev + 1);
      } else if (data.type === 'farmer_status_changed') {
        // Handle farmer status change event
        console.log('Farmer status changed:', data.data);
      }
    }
  });

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user?.id && !userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await MessagesAPI.list(user?.id || userId!);
      setMessages(response.messages);
      // Count unread messages
      const unread = response.messages.filter(msg => !msg.read).length;
      setUnreadCount(unread);
    } catch (err) {
      setError('Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userId]);

  // Send a message
  const sendMessage = useCallback(async (messageData: SendMessageRequest) => {
    try {
      const newMessage = await MessagesAPI.send(messageData);
      setMessages(prev => [...prev, newMessage]);
      
      // Send via WebSocket for real-time delivery
      if (isConnected) {
        sendWebSocketMessage({
          type: 'send_message',
          data: messageData
        });
      }
      
      return newMessage;
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    }
  }, [isConnected, sendWebSocketMessage]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const updatedMessage = await MessagesAPI.markAsRead(messageId);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, ...updatedMessage } : msg
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError('Failed to mark message as read');
      console.error('Error marking message as read:', err);
    }
  }, []);

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    try {
      // In a real implementation, you might want to batch this
      const readMessages = await Promise.all(
        messages
          .filter(msg => !msg.read)
          .map(msg => MessagesAPI.markAsRead(msg.id))
      );
      
      setMessages(prev => 
        prev.map(msg => {
          const updatedMsg = readMessages.find(m => m.id === msg.id);
          return updatedMsg ? { ...msg, ...updatedMsg } : msg;
        })
      );
      setUnreadCount(0);
    } catch (err) {
      setError('Failed to mark all messages as read');
      console.error('Error marking all messages as read:', err);
    }
  }, [messages]);

  // Load messages on mount
  useEffect(() => {
    if (user?.id || userId) {
      fetchMessages();
    }
  }, [user?.id, userId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    unreadCount,
    isConnected,
    sendMessage,
    markAsRead,
    markAllAsRead,
    refresh: fetchMessages
  };
};