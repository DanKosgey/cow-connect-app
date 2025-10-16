import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';
import { Collection } from '@/types/collection';
import { milkRateService } from '@/services/milk-rate-service';

interface RealtimeCollectionUpdate {
  collections: Collection[];
  recentCollection: Collection | null;
  totalLiters: number;
  totalAmount: number;
  lastUpdate: Date;
  isLoading: boolean;
}

export function useRealtimeCollections(farmerId?: string, staffId?: string) {
  const [state, setState] = useState<RealtimeCollectionUpdate>({
    collections: [],
    recentCollection: null,
    totalLiters: 0,
    totalAmount: 0,
    lastUpdate: new Date(),
    isLoading: true,
  });
  const { addNotification } = useNotification();

  const fetchInitialCollections = useCallback(async () => {
    let query = supabase
      .from('collections')
      .select(`
        *,
        farmers!fk_collections_farmer_id (
          id,
          user_id,
          profiles!user_id (
            full_name,
            phone
          )
        )
      `)
      .order('collection_date', { ascending: false });

    // Apply filters if provided
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    try {
      // Limit initial fetch to improve performance
      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Fetch the current admin rate to calculate total amounts
      const adminRate = await milkRateService.getCurrentRate();

      // Calculate total amount for each collection based on liters and admin rate
      const collectionsWithAmounts = data?.map(collection => ({
        ...collection,
        total_amount: collection.liters * adminRate
      })) || [];

      // Extract unique staff IDs from collections
      const staffIds = new Set<string>();
      collectionsWithAmounts.forEach(collection => {
        if (collection.staff_id) staffIds.add(collection.staff_id);
      });

      // Fetch staff profiles if we have staff IDs
      let enrichedCollections = collectionsWithAmounts;
      if (collectionsWithAmounts && staffIds.size > 0) {
        const { data: staffProfiles, error: profilesError } = await supabase
          .from('staff')
          .select(`
            id,
            profiles!user_id (
              full_name
            )
          `)
          .in('id', Array.from(staffIds));

        if (!profilesError && staffProfiles) {
          // Create a map of staff ID to profile
          const staffProfileMap = new Map<string, any>();
          staffProfiles.forEach(staff => {
            staffProfileMap.set(staff.id, staff.profiles);
          });

          // Enrich collections with staff names
          enrichedCollections = collectionsWithAmounts.map(collection => ({
            ...collection,
            staff: collection.staff_id ? { profiles: staffProfileMap.get(collection.staff_id) } : null
          }));
        }
      }

      const totalLiters = enrichedCollections?.reduce((sum, c) => sum + (c.liters || 0), 0) || 0;
      const totalAmount = enrichedCollections?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;

      setState(prev => ({
        ...prev,
        collections: enrichedCollections || [],
        totalLiters,
        totalAmount,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Error fetching collections:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [farmerId, staffId]);

  useEffect(() => {
    fetchInitialCollections();

    // Subscribe to collection changes
    const subscription = supabase
      .channel('collections_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'collections',
          filter: farmerId ? `farmer_id=eq.${farmerId}` : staffId ? `staff_id=eq.${staffId}` : undefined,
        },
        async (payload) => {
          const { eventType } = payload;
          const collection = payload.new as Collection;

          // Helper to fetch full collection details with joins
          const fetchFullCollection = async (id: string) => {
            const { data } = await supabase
              .from('collections')
              .select(`
                *,
                farmers!fk_collections_farmer_id (
                  id,
                  user_id,
                  profiles!user_id (
                    full_name,
                    phone
                  )
                )
              `)
              .eq('id', id)
              .single();
            return data;
          };

          switch (eventType) {
            case 'INSERT': {
              const fullCollection = await fetchFullCollection(collection.id);
              if (fullCollection) {
                // Fetch the current admin rate to calculate total amount
                const adminRate = await milkRateService.getCurrentRate();
                
                // Calculate total amount based on liters and admin rate
                const collectionWithAmount = {
                  ...fullCollection,
                  total_amount: fullCollection.liters * adminRate
                };

                // Enrich with staff data
                let enrichedCollection = collectionWithAmount;
                if (collectionWithAmount.staff_id) {
                  const { data: staffProfile } = await supabase
                    .from('staff')
                    .select(`
                      id,
                      profiles!user_id (
                        full_name
                      )
                    `)
                    .eq('id', collectionWithAmount.staff_id)
                    .single();
                  
                  if (staffProfile) {
                    enrichedCollection = {
                      ...collectionWithAmount,
                      staff: { profiles: staffProfile.profiles }
                    };
                  }
                }
                
                setState(prev => {
                  // Limit collections to 100 items to prevent memory issues
                  const newCollections = [enrichedCollection, ...prev.collections].slice(0, 100);
                  return {
                    ...prev,
                    collections: newCollections,
                    recentCollection: enrichedCollection,
                    totalLiters: prev.totalLiters + (enrichedCollection.liters || 0),
                    totalAmount: prev.totalAmount + (enrichedCollection.total_amount || 0),
                    lastUpdate: new Date(),
                  };
                });

                // Show appropriate notifications based on role
                if (farmerId) {
                  addNotification({
                    type: 'success',
                    title: 'New Collection Recorded',
                    message: `A new collection of ${collection.liters}L has been recorded with quality grade ${collection.quality_grade}`,
                    autoDismiss: true,
                  });
                } else if (staffId) {
                  addNotification({
                    type: 'success',
                    title: 'Collection Submitted',
                    message: `Collection of ${collection.liters}L has been successfully recorded`,
                    autoDismiss: true,
                  });
                } else {
                  // Admin notification
                  addNotification({
                    type: 'info',
                    title: 'New Collection Added',
                    message: `Staff ${enrichedCollection.staff?.profiles?.full_name} recorded ${collection.liters}L from farmer ${enrichedCollection.farmers?.profiles?.full_name}`,
                    autoDismiss: true,
                  });
                }
              }
              break;
            }
            case 'UPDATE': {
              const fullCollection = await fetchFullCollection(collection.id);
              if (fullCollection) {
                // Fetch the current admin rate to calculate total amount
                const adminRate = await milkRateService.getCurrentRate();
                
                // Calculate total amount based on liters and admin rate
                const collectionWithAmount = {
                  ...fullCollection,
                  total_amount: fullCollection.liters * adminRate
                };

                // Enrich with staff data
                let enrichedCollection = collectionWithAmount;
                if (collectionWithAmount.staff_id) {
                  const { data: staffProfile } = await supabase
                    .from('staff')
                    .select(`
                      id,
                      profiles!user_id (
                        full_name
                      )
                    `)
                    .eq('id', collectionWithAmount.staff_id)
                    .single();
                  
                  if (staffProfile) {
                    enrichedCollection = {
                      ...collectionWithAmount,
                      staff: { profiles: staffProfile.profiles }
                    };
                  }
                }
                
                setState(prev => {
                  const oldCollection = prev.collections.find(c => c.id === collection.id);
                  const litersDiff = (enrichedCollection.liters || 0) - (oldCollection?.liters || 0);
                  const amountDiff = (enrichedCollection.total_amount || 0) - (oldCollection?.total_amount || 0);
                  
                  return {
                    ...prev,
                    collections: prev.collections.map(c => 
                      c.id === collection.id ? enrichedCollection : c
                    ),
                    totalLiters: prev.totalLiters + litersDiff,
                    totalAmount: prev.totalAmount + amountDiff,
                    lastUpdate: new Date(),
                  };
                });

                // Show appropriate notifications based on role and change type
                const notificationMessage = getUpdateNotification(enrichedCollection, farmerId ? 'farmer' : staffId ? 'staff' : 'admin');
                if (notificationMessage) {
                  addNotification({
                    type: 'info',
                    title: 'Collection Updated',
                    message: notificationMessage,
                    autoDismiss: true,
                  });
                }
              }
              break;
            }
            case 'DELETE': {
              const oldCollection = payload.old as Collection;
              setState(prev => ({
                ...prev,
                collections: prev.collections.filter(c => c.id !== oldCollection.id),
                totalLiters: prev.totalLiters - (oldCollection.liters || 0),
                totalAmount: prev.totalAmount - (oldCollection.total_amount || 0),
                lastUpdate: new Date(),
              }));

              // Notify about deletion
              addNotification({
                type: 'warning',
                title: 'Collection Deleted',
                message: `Collection record has been removed from the system`,
                autoDismiss: true,
              });
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [farmerId, staffId, addNotification, fetchInitialCollections]);

  return state;
}

function getUpdateNotification(collection: Collection, role: 'farmer' | 'staff' | 'admin'): string {
  switch (role) {
    case 'farmer':
      return `Collection status updated to ${collection.status}. ${
        collection.status === 'Paid' 
          ? `Payment of KSh ${collection.total_amount} has been processed.`
          : ''
      }`;
    
    case 'staff':
      return `Collection #${collection.id} has been ${collection.status.toLowerCase()}`;
    
    case 'admin':
      return `Collection from ${collection.farmers?.profiles?.full_name} updated to status: ${collection.status}`;
    
    default:
      return `Collection status updated to ${collection.status}`;
  }
}

export function useRealtimeFarmerCollections(farmerId: string) {
  return useRealtimeCollections(farmerId);
}

export function useRealtimeStaffCollections(staffId: string) {
  return useRealtimeCollections(undefined, staffId);
}

export function useRealtimeAllCollections() {
  return useRealtimeCollections();
}