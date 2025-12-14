import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';
import { Collection } from '@/types/collection';
import { milkRateService } from '@/services/milk-rate-service';
import { realtimeCollectionsLogger } from '@/utils/logging-config';

interface RealtimeCollectionUpdate {
  collections: Collection[];
  recentCollection: Collection | null;
  totalLiters: number;
  totalAmount: number;
  lastUpdate: Date;
  isLoading: boolean;
  error: string | null;
}

export function useRealtimeCollections(farmerId?: string, staffId?: string) {
  const [state, setState] = useState<RealtimeCollectionUpdate>({
    collections: [],
    recentCollection: null,
    totalLiters: 0,
    totalAmount: 0,
    lastUpdate: new Date(),
    isLoading: true,
    error: null,
  });
  const { addNotification } = useNotification();
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const lastFetchTimeRef = useRef<number>(0);

  const fetchInitialCollections = useCallback(async () => {
    // Rate limiting - prevent too frequent fetches
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 5000) { // At least 5 seconds between fetches
      realtimeCollectionsLogger.info('Skipping fetch - too soon since last fetch');
      return;
    }
    lastFetchTimeRef.current = now;
    
    realtimeCollectionsLogger.info('Fetching initial collections', { farmerId, staffId });
    
    // Check if we have a valid session first
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        realtimeCollectionsLogger.error('Session check failed', sessionError);
        setState(prev => ({ ...prev, isLoading: false, error: 'Authentication check failed' }));
        return;
      }
      
      if (!session) {
        realtimeCollectionsLogger.warn('No valid session found');
        setState(prev => ({ ...prev, isLoading: false, error: 'Please log in to view collections' }));
        return;
      }
    } catch (sessionCheckError) {
      realtimeCollectionsLogger.error('Exception during session check', sessionCheckError);
      setState(prev => ({ ...prev, isLoading: false, error: 'Authentication check failed' }));
      return;
    }
    
    let query = supabase
      .from('collections')
      .select(`
        *,
        farmers (
          id,
          user_id,
          profiles (
            full_name,
            phone
          )
        ),
        staff (
          id,
          profiles (
            full_name
          )
        )
      `)
      .order('collection_date', { ascending: false })
      .limit(100); // Add limit to prevent excessive data

    // Apply filters if provided
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    try {
      const { data, error } = await query;
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        realtimeCollectionsLogger.info('Component unmounted during fetch, aborting');
        return;
      }
      
      if (error) {
        realtimeCollectionsLogger.error('Error fetching collections data', error);
        console.error('Error fetching collections data:', error);
        
        // Handle authentication errors specifically
        if (error.message && (error.message.includes('apikey') || error.message.includes('Unauthorized') || error.message.includes('401') || error.message.includes('400'))) {
          realtimeCollectionsLogger.error('Authentication error when fetching collections', { 
            message: error.message,
            code: error.code 
          });
          setState(prev => ({ 
            ...prev, 
            isLoading: false,
            error: 'Your session has expired. Please refresh the page or log in again.',
            collections: []
          }));
          return;
        }
        
        // Handle rate limiting
        if (error.message && error.message.includes('429')) {
          realtimeCollectionsLogger.warn('Rate limit hit, retrying...', { retryCount: retryCountRef.current });
          
          // Retry with exponential backoff
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
            
            setTimeout(() => {
              if (isMountedRef.current) {
                fetchInitialCollections();
              }
            }, delay);
            return;
          } else {
            setState(prev => ({ 
              ...prev, 
              isLoading: false,
              error: 'Too many requests. Please wait a moment and try again.',
              collections: []
            }));
            return;
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: error.message || 'Failed to fetch collections data',
          collections: []
        }));
        return;
      }

      realtimeCollectionsLogger.info('Initial collections fetched successfully', { count: data?.length || 0 });
      retryCountRef.current = 0; // Reset retry count on success

      // Fetch the current admin rate to calculate total amounts
      let adminRate = 0;
      try {
        adminRate = await milkRateService.getCurrentRate();
        realtimeCollectionsLogger.debug('Admin rate fetched', { rate: adminRate });
      } catch (rateError) {
        realtimeCollectionsLogger.warn('Failed to fetch admin rate, using default', rateError);
        adminRate = 0; // Use 0 as fallback
      }

      // Calculate total amount for each collection based on liters and admin rate
      const collectionsWithAmounts = data?.map(collection => ({
        ...collection,
        total_amount: collection.total_amount || (collection.liters * adminRate)
      })) || [];

      const totalLiters = collectionsWithAmounts?.reduce((sum, c) => sum + (c.liters || 0), 0) || 0;
      const totalAmount = collectionsWithAmounts?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;

      realtimeCollectionsLogger.info('Collections processing completed', { 
        totalCollections: collectionsWithAmounts?.length || 0,
        totalLiters,
        totalAmount
      });

      setState(prev => ({
        ...prev,
        collections: collectionsWithAmounts || [],
        totalLiters,
        totalAmount,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      if (!isMountedRef.current) {
        realtimeCollectionsLogger.info('Component unmounted during error handling, aborting');
        return;
      }
      
      realtimeCollectionsLogger.error('Error fetching collections', error);
      console.error('Error fetching collections:', error);
      
      // Set state to show error but stop loading
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'An unexpected error occurred while fetching collections',
        collections: []
      }));
    }
  }, [farmerId, staffId]);

  useEffect(() => {
    realtimeCollectionsLogger.info('Hook mounted/updated', { farmerId, staffId });
    isMountedRef.current = true;
    retryCountRef.current = 0;
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
          // Check if component is still mounted
          if (!isMountedRef.current) {
            realtimeCollectionsLogger.info('Component unmounted during realtime update, aborting');
            return;
          }

          const { eventType } = payload;
          const collection = payload.new as Collection;
          
          realtimeCollectionsLogger.info('Realtime event received', { eventType, collectionId: collection.id });

          // Helper to fetch full collection details with joins
          const fetchFullCollection = async (id: string) => {
            realtimeCollectionsLogger.debug('Fetching full collection details', { id });
            const { data } = await supabase
              .from('collections')
              .select(`
                *,
                farmers (
                  id,
                  user_id,
                  profiles (
                    full_name,
                    phone
                  )
                ),
                staff (
                  id,
                  profiles (
                    full_name
                  )
                )
              `)
              .eq('id', id)
              .single();
            return data;
          };

          switch (eventType) {
            case 'INSERT': {
              realtimeCollectionsLogger.info('Processing INSERT event');
              const fullCollection = await fetchFullCollection(collection.id);
              if (fullCollection && isMountedRef.current) {
                // Fetch the current admin rate to calculate total amount
                let adminRate = 0;
                try {
                  adminRate = await milkRateService.getCurrentRate();
                  realtimeCollectionsLogger.debug('Admin rate for INSERT', { rate: adminRate });
                } catch (rateError) {
                  realtimeCollectionsLogger.warn('Failed to fetch admin rate for INSERT, using default', rateError);
                }
                
                // Calculate total amount based on liters and admin rate
                const collectionWithAmount = {
                  ...fullCollection,
                  total_amount: fullCollection.total_amount || (fullCollection.liters * adminRate)
                };

                if (isMountedRef.current) {
                  realtimeCollectionsLogger.info('INSERT processed successfully', { 
                    collectionId: collectionWithAmount.id,
                    liters: collectionWithAmount.liters,
                    amount: collectionWithAmount.total_amount
                  });
                  
                  setState(prev => {
                    // Limit collections to 100 items to prevent memory issues
                    const newCollections = [collectionWithAmount, ...prev.collections].slice(0, 100);
                    return {
                      ...prev,
                      collections: newCollections,
                      recentCollection: collectionWithAmount,
                      totalLiters: prev.totalLiters + (collectionWithAmount.liters || 0),
                      totalAmount: prev.totalAmount + (collectionWithAmount.total_amount || 0),
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
                      message: `Staff ${collectionWithAmount.staff?.profiles?.full_name} recorded ${collection.liters}L from farmer ${collectionWithAmount.farmers?.profiles?.full_name}`,
                      autoDismiss: true,
                    });
                  }
                }
              }
              break;
            }
            case 'UPDATE': {
              realtimeCollectionsLogger.info('Processing UPDATE event');
              const fullCollection = await fetchFullCollection(collection.id);
              if (fullCollection && isMountedRef.current) {
                // Fetch the current admin rate to calculate total amount
                let adminRate = 0;
                try {
                  adminRate = await milkRateService.getCurrentRate();
                  realtimeCollectionsLogger.debug('Admin rate for UPDATE', { rate: adminRate });
                } catch (rateError) {
                  realtimeCollectionsLogger.warn('Failed to fetch admin rate for UPDATE, using default', rateError);
                }
                
                // Calculate total amount based on liters and admin rate
                const collectionWithAmount = {
                  ...fullCollection,
                  total_amount: fullCollection.total_amount || (fullCollection.liters * adminRate)
                };

                if (isMountedRef.current) {
                  realtimeCollectionsLogger.info('UPDATE processed successfully', { 
                    collectionId: collectionWithAmount.id,
                    liters: collectionWithAmount.liters,
                    amount: collectionWithAmount.total_amount
                  });
                  
                  setState(prev => {
                    const oldCollection = prev.collections.find(c => c.id === collection.id);
                    const litersDiff = (collectionWithAmount.liters || 0) - (oldCollection?.liters || 0);
                    const amountDiff = (collectionWithAmount.total_amount || 0) - (oldCollection?.total_amount || 0);
                    
                    return {
                      ...prev,
                      collections: prev.collections.map(c => 
                        c.id === collection.id ? collectionWithAmount : c
                      ),
                      totalLiters: prev.totalLiters + litersDiff,
                      totalAmount: prev.totalAmount + amountDiff,
                      lastUpdate: new Date(),
                    };
                  });

                  // Show appropriate notifications based on role and change type
                  const notificationMessage = getUpdateNotification(collectionWithAmount, farmerId ? 'farmer' : staffId ? 'staff' : 'admin');
                  if (notificationMessage) {
                    addNotification({
                      type: 'info',
                      title: 'Collection Updated',
                      message: notificationMessage,
                      autoDismiss: true,
                    });
                  }
                }
              }
              break;
            }
            case 'DELETE': {
              realtimeCollectionsLogger.info('Processing DELETE event');
              const oldCollection = payload.old as Collection;
              if (isMountedRef.current) {
                realtimeCollectionsLogger.info('DELETE processed successfully', { collectionId: oldCollection.id });
                
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
              }
              break;
            }
          }
        }
      )
      .subscribe();

    realtimeCollectionsLogger.info('Realtime subscription created');

    return () => {
      realtimeCollectionsLogger.info('Hook unmounting, cleaning up');
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [farmerId, staffId, addNotification, fetchInitialCollections]);

  // Function to manually refresh data
  const refreshData = useCallback(async () => {
    realtimeCollectionsLogger.info('Manual refresh requested');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    retryCountRef.current = 0;
    await fetchInitialCollections();
  }, [fetchInitialCollections]);

  return { ...state, refreshData };
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
  realtimeCollectionsLogger.info('useRealtimeAllCollections called');
  return useRealtimeCollections();
}