import { useEffect, useState, useCallback } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import type { CollectionFormData, OfflineCollection, SyncStatus } from '@/types/staff.types';

const STORAGE_KEY = 'offline_collections';

export function useOfflineSync() {
  const [offlineCollections, setOfflineCollections] = useState<OfflineCollection[]>([]);
  const [syncing, setSyncing] = useState(false);
  const toast = useToastNotifications();

  // Load offline collections from local storage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setOfflineCollections(JSON.parse(stored));
    }
  }, []);

  // Save changes to local storage
  const saveToStorage = useCallback((collections: OfflineCollection[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    setOfflineCollections(collections);
  }, []);

  // Add new collection to offline storage
  const addCollection = useCallback((data: CollectionFormData) => {
    const newCollection: OfflineCollection = {
      ...data,
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      sync_status: 'pending',
      created_at: new Date().toISOString(),
    };

    saveToStorage([...offlineCollections, newCollection]);
    
    // Attempt to sync immediately if online
    if (navigator.onLine) {
      syncCollections();
    }
  }, [offlineCollections, saveToStorage]);

  // Sync collections with the server
  const syncCollections = useCallback(async () => {
    if (syncing || !navigator.onLine) return;

    setSyncing(true);
    const pendingCollections = offlineCollections.filter(c => c.sync_status === 'pending');
    
    for (const collection of pendingCollections) {
      try {
        const { data, error } = await supabase.rpc('record_milk_collection', {
          farmer_id: collection.farmer_id,
          staff_id: (await supabase.auth.getUser()).data.user?.id,
          collection_point_id: collection.collection_point_id,
          quantity: collection.quantity,
          quality_grade: collection.quality_grade,
          temperature: collection.temperature,
          latitude: collection.latitude,
          longitude: collection.longitude,
          photo_url: collection.photo_url,
          local_id: collection.local_id,
          device_timestamp: collection.device_timestamp,
        });

        if (error) throw error;

        // Update local storage
        const updated = offlineCollections.map(c =>
          c.id === collection.id
            ? { ...c, sync_status: 'synced' as SyncStatus }
            : c
        );
        saveToStorage(updated);

        toast.success('Sync Successful', 'Collection record has been synced with the server');
      } catch (error: any) {
        console.error('Sync error:', error);
        
        // Update error status in local storage
        const updated = offlineCollections.map(c =>
          c.id === collection.id
            ? {
                ...c,
                sync_status: 'error' as SyncStatus,
                sync_error: error.message,
              }
            : c
        );
        saveToStorage(updated);

        toast.error('Sync Failed', error.message);
      }
    }

    setSyncing(false);
  }, [offlineCollections, saveToStorage, toast]);

  // Attempt to sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      syncCollections();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncCollections]);

  // Clean up synced collections older than 7 days
  useEffect(() => {
    const cleanup = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const filtered = offlineCollections.filter(collection => {
        if (collection.sync_status !== 'synced') return true;
        return new Date(collection.created_at) > sevenDaysAgo;
      });

      if (filtered.length !== offlineCollections.length) {
        saveToStorage(filtered);
      }
    };

    cleanup();
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000); // Run daily
    return () => clearInterval(interval);
  }, [offlineCollections, saveToStorage]);

  return {
    offlineCollections,
    pendingCount: offlineCollections.filter(c => c.sync_status === 'pending').length,
    errorCount: offlineCollections.filter(c => c.sync_status === 'error').length,
    syncing,
    addCollection,
    syncCollections,
  };
}