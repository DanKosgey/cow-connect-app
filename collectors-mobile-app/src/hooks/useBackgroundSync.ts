
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { farmerSyncService } from '../services/farmer.sync.service';
import { collectionSyncService } from '../services/collection.sync.service';

export const useBackgroundSync = () => {
    useEffect(() => {
        let syncInterval: NodeJS.Timeout;

        const unsubscribe = NetInfo.addEventListener(async (state) => {
            if (state.isConnected && state.isInternetReachable) {
                // Trigger immediate sync when coming online
                await performSync();

                // Set up periodic sync every 5 minutes
                syncInterval = setInterval(performSync, 5 * 60 * 1000);
            } else {
                // Clear interval when offline
                if (syncInterval) clearInterval(syncInterval);
            }
        });

        return () => {
            unsubscribe();
            if (syncInterval) clearInterval(syncInterval);
        };
    }, []);

    const performSync = async () => {
        try {
            // Upload pending collections first
            await collectionSyncService.uploadPendingCollections();

            // Then sync farmer updates
            await farmerSyncService.syncFarmerUpdates();
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    };
};
