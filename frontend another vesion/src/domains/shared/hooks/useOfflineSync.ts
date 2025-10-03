import { useState, useEffect, useCallback } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { CollectionsAPI } from '@/services/ApiService';
import { Collection } from '@/types';

interface OfflineCollection extends Collection {
  synced: boolean;
  timestamp: string;
}

interface QueueStatus {
  pending: number;
  synced: number;
  failed: number;
}

interface UseOfflineSyncReturn {
  addToQueue: (collection: Collection) => Promise<void>;
  syncQueue: () => Promise<void>;
  queueStatus: QueueStatus;
  isSyncing: boolean;
  syncError: string | null;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    synced: 0,
    failed: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { 
    isInitialized, 
    addCollection, 
    getUnsyncedCollections, 
    markCollectionAsSynced,
    updateCollection
  } = useIndexedDB();

  // Update queue status
  const updateQueueStatus = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      const unsynced = await getUnsyncedCollections();
      const pending = unsynced.filter(c => !c.synced).length;
      const synced = unsynced.filter(c => c.synced).length;
      
      setQueueStatus({
        pending,
        synced,
        failed: 0 // In a real implementation, you would track failed syncs
      });
    } catch (err) {
      console.error('Error updating queue status:', err);
    }
  }, [isInitialized, getUnsyncedCollections]);

  // Add collection to offline queue
  const addToQueue = useCallback(async (collection: Collection) => {
    if (!isInitialized) {
      throw new Error('IndexedDB not initialized');
    }
    
    try {
      const offlineCollection: OfflineCollection = {
        ...collection,
        synced: false,
        timestamp: new Date().toISOString()
      };
      
      await addCollection(offlineCollection);
      await updateQueueStatus();
    } catch (err) {
      console.error('Error adding to offline queue:', err);
      throw new Error('Failed to add collection to offline queue');
    }
  }, [isInitialized, addCollection, updateQueueStatus]);

  // Sync offline queue with backend
  const syncQueue = useCallback(async () => {
    if (!isInitialized || isSyncing) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const unsyncedCollections = await getUnsyncedCollections();
      const pendingCollections = unsyncedCollections.filter(c => !c.synced);
      
      for (const collection of pendingCollections) {
        try {
          // Submit to backend
          await CollectionsAPI.create(collection);
          
          // Mark as synced
          await markCollectionAsSynced(collection.id);
        } catch (err) {
          console.error(`Failed to sync collection ${collection.id}:`, err);
          // In a real implementation, you might want to mark as failed and retry later
        }
      }
      
      await updateQueueStatus();
    } catch (err) {
      const errorMessage = 'Failed to sync offline collections';
      console.error(errorMessage, err);
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [isInitialized, isSyncing, getUnsyncedCollections, markCollectionAsSynced, updateQueueStatus]);

  // Initialize and update queue status
  useEffect(() => {
    if (isInitialized) {
      updateQueueStatus();
    }
  }, [isInitialized, updateQueueStatus]);

  // Auto-sync when online status changes
  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncQueue]);

  return {
    addToQueue,
    syncQueue,
    queueStatus,
    isSyncing,
    syncError
  };
};