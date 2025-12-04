import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';

interface UseRealtimeInventoryProps {
  onProductsUpdate: (products: AgrovetProduct[]) => void;
}

interface UseRealtimeInventoryReturn {
  isSubscribed: boolean;
}

export const useRealtimeInventory = ({ onProductsUpdate }: UseRealtimeInventoryProps): UseRealtimeInventoryReturn => {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    console.log('useRealtimeInventory: Initializing');
    // Subscribe to inventory changes
    const channel = supabase
      .channel('inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agrovet_inventory'
        },
        (payload) => {
          console.log('useRealtimeInventory: Inventory change detected', payload);
          // When there's a change, fetch the updated inventory
          fetchInventory();
        }
      )
      .subscribe((status) => {
        console.log('useRealtimeInventory: Subscription status', status);
      });

    subscriptionRef.current = channel;

    // Don't do initial fetch here since the component handles it
    // fetchInventory();

    return () => {
      console.log('useRealtimeInventory: Cleaning up subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  const fetchInventory = async () => {
    try {
      console.log('useRealtimeInventory: Fetching inventory from Supabase');
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('useRealtimeInventory: Error fetching inventory:', error);
        console.error('useRealtimeInventory: Error details:', error.message, error.details, error.hint);
        return;
      }

      console.log('useRealtimeInventory: Successfully fetched inventory, count:', data?.length || 0);
      onProductsUpdate(data as AgrovetProduct[]);
    } catch (error) {
      console.error('useRealtimeInventory: Exception fetching inventory:', error);
    }
  };

  // Return subscription status
  return {
    isSubscribed: !!subscriptionRef.current
  };
};;