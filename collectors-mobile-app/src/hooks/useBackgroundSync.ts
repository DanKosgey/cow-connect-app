
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { farmerSyncService } from '../services/farmer.sync.service';
import { collectionSyncService } from '../services/collection.sync.service';
import { collectorRateService } from '../services/collector.rate.service';
import { milkRateService } from '../services/milk.rate.service';

import { DeviceEventEmitter } from 'react-native';

// Shared lock to prevent concurrent syncs
let isSyncing = false;

export const useBackgroundSync = () => {

    useEffect(() => {
        console.log('[SYNC] Initializing background sync listener...');
        let syncInterval: NodeJS.Timeout;

        const unsubscribe = NetInfo.addEventListener(async (state) => {
            console.log(`[SYNC] Network State Change: Connected=${state.isConnected}, Reachable=${state.isInternetReachable}`);

            // Trigger if connected (even if reachability is pending/unknown)
            if (state.isConnected) {
                // SCALABILITY: Add random jitter (2s-15s) to prevent "Thundering Herd" of 100+ collectors
                const jitterMs = Math.floor(Math.random() * 13000) + 2000;
                console.log(`[SYNC] Connection detected! Scheduling sync in ${jitterMs}ms...`);

                // Use setTimeout to delay the initial sync
                setTimeout(async () => {
                    await performSync();
                }, jitterMs);

                // Set up periodic sync every 2 minutes while connected
                if (!syncInterval) {
                    syncInterval = setInterval(performSync, 2 * 60 * 1000);
                }
            } else {
                console.log('[SYNC] Offline. Pausing auto-sync.');
                if (syncInterval) {
                    clearInterval(syncInterval);
                    syncInterval = undefined as any;
                }
            }
        });

        return () => {
            unsubscribe();
            if (syncInterval) clearInterval(syncInterval);
        };
    }, []);

    const performSync = async () => {
        if (isSyncing) {
            console.log('[SYNC] Sync already in progress, skipping...');
            return;
        }

        isSyncing = true;
        console.log('[SYNC] Starting sync process...');

        try {
            // Upload pending collections first
            const collectionResults = await collectionSyncService.uploadPendingCollections();
            console.log('[SYNC] Pending collections upload result:', collectionResults);

            // Then sync farmer updates
            await farmerSyncService.syncFarmerUpdates();
            console.log('[SYNC] Farmers sync completed');

            // Sync rates (both collector and milk rates)
            await collectorRateService.syncRates();
            await milkRateService.syncRates();
            console.log('[SYNC] Rates sync completed');

            // Emit event if anything was processed
            if (collectionResults.success > 0 || collectionResults.failed > 0) {
                console.log('[SYNC] Emitting SYNC_COMPLETED event');
                DeviceEventEmitter.emit('SYNC_COMPLETED');
            }
        } catch (error) {
            console.error('[SYNC] Background sync failed:', error);
        } finally {
            isSyncing = false;
        }
    };
};
