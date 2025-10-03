import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { Collection, Farmer, Staff } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

interface AdminNotificationData {
  event_type: string;
  data: any;
  timestamp: string;
}

interface UseAdminNotificationsProps {
  onNewCollection?: (collection: Collection) => void;
  onKycStatusUpdate?: (farmerId: string, status: string) => void;
  onNewFarmer?: (farmer: Farmer) => void;
  onNewStaff?: (staff: Staff) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const useAdminNotifications = ({
  onNewCollection,
  onKycStatusUpdate,
  onNewFarmer,
  onNewStaff,
  onConnectionChange
}: UseAdminNotificationsProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.id || 'admin'; // Fallback to 'admin' if no user ID

  // Construct WebSocket URL - using notifications endpoint for admin with token
  const getWsUrl = useCallback(() => {
    // Get the access token from our FastAPI auth service
    const accessToken = supabaseFastApiAuth.getToken();
    
    if (!accessToken) {
      console.error('No access token available for WebSocket connection');
      return null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Include the token as a query parameter
    return `${protocol}//${hostname}${port}/api/v1/ws/notifications/${userId}?token=${encodeURIComponent(accessToken)}`;
  }, [userId]);

  const wsUrl = getWsUrl();

  const {
    isConnected,
    error: wsError,
    sendMessage
  } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log('Connected to admin notifications');
      setIsLoading(false);
      onConnectionChange?.(true);
    },
    onClose: () => {
      console.log('Disconnected from admin notifications');
      onConnectionChange?.(false);
    },
    onError: (error) => {
      console.error('Admin WebSocket error:', error);
      setError('Failed to connect to admin notifications');
      onConnectionChange?.(false);
    },
    onMessage: (data: AdminNotificationData) => {
      handleNotification(data);
    }
  });

  const handleNotification = useCallback((data: AdminNotificationData) => {
    console.log('Received admin notification:', data);
    
    switch (data.event_type) {
      case 'new_collection':
        // Handle new collection notification
        if (data.data && typeof data.data === 'object') {
          const newCollection: Collection = {
            id: data.data.collection_id,
            farmer_id: data.data.farmer_id,
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
          const farmerId = data.data.farmer_id || '';
          const newStatus = data.data.new_status || '';
          onKycStatusUpdate?.(farmerId, newStatus);
        }
        break;
        
      case 'new_farmer':
        // Handle new farmer registration
        if (data.data && typeof data.data === 'object') {
          const newFarmer: Farmer = {
            id: data.data.id,
            name: data.data.name,
            phone: data.data.phone,
            email: data.data.email,
            address: data.data.address,
            location_coordinates: data.data.location_coordinates,
            national_id: data.data.national_id,
            gov_id_url: data.data.gov_id_url,
            selfie_url: data.data.selfie_url,
            qr_code: data.data.qr_code,
            nfc_uid: data.data.nfc_uid,
            kyc_status: data.data.kyc_status,
            registered_at: data.data.registered_at,
            approved_at: data.data.approved_at,
            rejected_reason: data.data.rejected_reason,
            card_issued: data.data.card_issued,
            daily_validation_code: data.data.daily_validation_code,
            total_collections: data.data.total_collections,
            total_volume: data.data.total_volume,
            total_earnings: data.data.total_earnings,
            last_collection_date: data.data.last_collection_date
          };
          setFarmers(prev => [newFarmer, ...prev]);
          onNewFarmer?.(newFarmer);
        }
        break;
        
      case 'new_staff':
        // Handle new staff member
        if (data.data && typeof data.data === 'object') {
          const newStaff: Staff = {
            id: data.data.id,
            name: data.data.name,
            phone: data.data.phone,
            email: data.data.email,
            role: data.data.role,
            is_active: data.data.is_active,
            last_active_at: data.data.last_active_at,
            assigned_routes: data.data.assigned_routes,
            created_at: data.data.created_at
          };
          setStaff(prev => [newStaff, ...prev]);
          onNewStaff?.(newStaff);
        }
        break;
        
      case 'connected':
        console.log('Successfully connected to admin notifications');
        break;
        
      case 'heartbeat':
        // Heartbeat - no action needed
        break;
        
      default:
        console.log('Unknown admin event type:', data.event_type);
    }
  }, [onNewCollection, onKycStatusUpdate, onNewFarmer, onNewStaff]);

  const sendNotification = useCallback((message: any) => {
    sendMessage(message);
  }, [sendMessage]);

  // Update error state when WebSocket error changes
  useEffect(() => {
    if (wsError) {
      setError('Admin WebSocket connection error');
    }
  }, [wsError]);

  return {
    collections,
    farmers,
    staff,
    isConnected,
    isLoading,
    error,
    sendNotification
  };
};