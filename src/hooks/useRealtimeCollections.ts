import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';

interface Collection {
  id: string;
  farmer_id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export function useRealtimeCollections(farmerId?: string) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentCollection, setRecentCollection] = useState<Collection | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial collections
    const fetchInitialCollections = async () => {
      let query = supabase
        .from('collections')
        .select('*')
        .order('collection_date', { ascending: false });
      
      if (farmerId) {
        query = query.eq('farmer_id', farmerId);
      }
      
      const { data } = await query.limit(10);
      setCollections(data || []);
    };

    fetchInitialCollections();

    // Subscribe to collection changes
    const subscription = supabase
      .channel('collections_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collections',
        },
        async (payload) => {
          const newCollection = payload.new as Collection;
          
          // If we're filtering by farmerId, only show notifications for that farmer
          if (!farmerId || newCollection.farmer_id === farmerId) {
            setCollections((current) => [newCollection, ...current.slice(0, 9)]);
            setRecentCollection(newCollection);
            
            // Show notification for new collections
            addNotification({
              type: 'success',
              title: 'New Collection Recorded',
              message: `A new collection of ${newCollection.liters}L has been recorded with quality grade ${newCollection.quality_grade}`,
              autoDismiss: true,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
        },
        async (payload) => {
          const updatedCollection = payload.new as Collection;
          
          // If we're filtering by farmerId, only update for that farmer
          if (!farmerId || updatedCollection.farmer_id === farmerId) {
            setCollections((current) => 
              current.map(collection => 
                collection.id === updatedCollection.id ? updatedCollection : collection
              )
            );
            
            // Show notification for updated collections
            addNotification({
              type: 'info',
              title: 'Collection Updated',
              message: `Collection status updated to ${updatedCollection.status}`,
              autoDismiss: true,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [farmerId, addNotification]);

  return { collections, recentCollection };
}

export function useRealtimeFarmerCollections(farmerId: string) {
  return useRealtimeCollections(farmerId);
}

export function useRealtimeAllCollections() {
  return useRealtimeCollections();
}