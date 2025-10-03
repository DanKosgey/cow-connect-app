import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { Collection, Farmer } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface FarmerNotificationData {
  event_type: string;
  farmer_id: string;
  data: any;
  timestamp: string;
}

interface UseFarmerNotificationsProps {
  farmerId: string;
  onNewCollection?: (collection: Collection) => void;
  onKycStatusUpdate?: (farmer: Farmer) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const useFarmerNotifications = ({
  farmerId,
  onNewCollection,
  onKycStatusUpdate,
  onConnectionChange
}: UseFarmerNotificationsProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [kycStatus, setKycStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth(); // Add auth context

  // Construct WebSocket URL with authentication token
  const getWsUrl = useCallback(() => {
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
    return `${protocol}//${hostname}${port}/api/v1/ws/notifications/${farmerId}?token=${encodeURIComponent(accessToken)}`;
  }, [session, farmerId]);

  const wsUrl = getWsUrl();

  const {
    isConnected,
    error: wsError,
    sendMessage
  } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log(`Connected to farmer notifications for farmer ${farmerId}`);
      setIsLoading(false);
      onConnectionChange?.(true);
    },
    onClose: () => {
      console.log(`Disconnected from farmer notifications for farmer ${farmerId}`);
      onConnectionChange?.(false);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to notifications');
      onConnectionChange?.(false);
    },
    onMessage: (data: FarmerNotificationData) => {
      handleNotification(data);
    }
  });

  const handleNotification = useCallback((data: FarmerNotificationData) => {
    console.log('Received farmer notification:', data);
    
    switch (data.event_type) {
      case 'new_collection':
        // Handle new collection notification
        if (data.data && typeof data.data === 'object') {
          const newCollection: Collection = {
            id: data.data.collection_id,
            farmer_id: data.farmer_id,
            farmer_name: '', // Will be filled by parent component
            staff_id: '', // Will be filled by parent component
            staff_name: '', // Will be filled by parent component
            liters: data.data.liters,
            gps_latitude: 0, // Will be filled by parent component
            gps_longitude: 0, // Will be filled by parent component
            photo_url: '',
            timestamp: data.data.timestamp,
            tx_hash: '',
            validation_code: data.data.validation_code,
            quality_grade: 'A', // Default value
            temperature: 0, // Default value
            fat_content: 0, // Default value
            protein_content: 0 // Default value
          };
          
          setCollections(prev => [newCollection, ...prev]);
          onNewCollection?.(newCollection);
        }
        break;
        
      case 'kyc_status_update':
        // Handle KYC status update
        if (data.data && typeof data.data === 'object') {
          const newStatus = data.data.new_status || '';
          setKycStatus(newStatus);
          // Create a minimal farmer object for the callback
          const updatedFarmer: Farmer = {
            id: data.farmer_id,
            name: '', // Will be filled by parent component
            phone: '',
            email: '',
            address: '',
            national_id: '',
            kyc_status: newStatus,
            registered_at: ''
          } as unknown as Farmer;
          onKycStatusUpdate?.(updatedFarmer);
        }
        break;
        
      case 'connected':
        console.log('Successfully connected to farmer notifications');
        break;
        
      case 'heartbeat':
        // Heartbeat - no action needed
        break;
        
      default:
        console.log('Unknown event type:', data.event_type);
    }
  }, [onNewCollection, onKycStatusUpdate]);

  const sendNotification = useCallback((message: any) => {
    sendMessage(message);
  }, [sendMessage]);

  // Update error state when WebSocket error changes
  useEffect(() => {
    if (wsError) {
      setError('WebSocket connection error');
    }
  }, [wsError]);

  return {
    collections,
    kycStatus,
    isConnected,
    isLoading,
    error,
    sendNotification
  };
};