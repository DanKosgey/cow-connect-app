
import { supabase } from './supabase';
import { getDatabase } from './database';

export const farmerSyncService = {
    // Initial full sync
    // Flag to track sync status
    isSyncing: false,

    // Smart Sync: Decides whether to do full or incremental based on state
    async syncFarmers(collectorId: string, forceFull: boolean = false) {
        if (this.isSyncing) {
            console.log('🔄 [SYNC] Farmer sync already in progress, skipping...');
            return { success: true, count: 0, skipped: true };
        }

        try {
            this.isSyncing = true;
            const db = await getDatabase();

            // Check last sync time
            const metadata = await db.getFirstAsync<{ last_sync: string }>(
                "SELECT last_sync FROM sync_metadata WHERE entity_type = 'farmers'"
            );

            // If forced or never synced, do full sync
            if (forceFull || !metadata?.last_sync) {
                console.log('🔄 [SYNC] Performing FULL farmer sync (Forced or First Run)...');
                return await this.performFullSync(db);
            }

            // Otherwise, do incremental
            console.log(`🔄 [SYNC] Performing INCREMENTAL sync since ${metadata.last_sync}...`);
            return await this.performIncrementalSync(db, metadata.last_sync);

        } catch (error) {
            console.error('❌ [SYNC] Farmer sync failed:', error);
            return { success: false, count: 0, error };
        } finally {
            this.isSyncing = false;
        }
    },

    // Legacy method alias for backward compatibility, now smart
    async syncAllFarmers(collectorId: string) {
        return this.syncFarmers(collectorId, false); // Default to smart/incremental
    },

    // Force full re-download (for the manual button)
    async forceRefreshFarmers() {
        return this.syncFarmers('user', true);
    },

    // Private: Full Sync (Deletes all and redownloads)
    async performFullSync(db: any) {
        try {
            const { data: farmers, error } = await supabase.from('farmers').select('*');

            if (error) throw error;
            console.log(`[SYNC] Downloaded ${farmers?.length} farmers (Full).`);

            await db.withTransactionAsync(async () => {
                // We do NOT delete all farmers to avoid FK constraint errors with pending collections
                // Instead we just upsert all of them. Deleted farmers on server will remain locally 
                // but that is safer than breaking pending uploads.
                // await db.runAsync('DELETE FROM farmers_local'); 

                if (farmers && farmers.length > 0) {
                    await this.batchInsertFarmers(db, farmers);
                }

                await db.runAsync(
                    `INSERT OR REPLACE INTO sync_metadata (entity_type, last_sync, total_synced, sync_status)
                     VALUES ('farmers', CURRENT_TIMESTAMP, ?, 'completed')`,
                    [farmers?.length || 0]
                );
            });
            console.log('✅ [SYNC] Full Sync Completed.');
            return { success: true, count: farmers?.length || 0 };
        } catch (e) {
            console.error('[SYNC] Full sync error:', e);
            throw e;
        }
    },

    // Private: Incremental Sync (Updates/Inserts only changed records)
    async performIncrementalSync(db: any, lastSync: string) {
        try {
            const { data: farmers, error } = await supabase
                .from('farmers')
                .select('*')
                .gt('updated_at', lastSync); // Only get newer than last sync

            if (error) throw error;

            if (!farmers || farmers.length === 0) {
                console.log('✅ [SYNC] No new farmer updates found in cloud.');
                // Still update timestamp to show we checked
                await db.runAsync(
                    "UPDATE sync_metadata SET last_sync = CURRENT_TIMESTAMP WHERE entity_type = 'farmers'"
                );
                return { success: true, count: 0 };
            }

            console.log(`[SYNC] Found ${farmers.length} updated/new farmers.`);

            await db.withTransactionAsync(async () => {
                await this.batchInsertFarmers(db, farmers);

                // Update specific counts or just timestamp
                await db.runAsync(
                    "UPDATE sync_metadata SET last_sync = CURRENT_TIMESTAMP, sync_status = 'completed' WHERE entity_type = 'farmers'"
                );
            });

            console.log('✅ [SYNC] Incremental Sync Completed.');
            return { success: true, count: farmers.length };
        } catch (e) {
            console.error('[SYNC] Incremental sync error:', e);
            throw e;
        }
    },

    // Private: Helper to insert/upsert farmers
    async batchInsertFarmers(db: any, farmers: any[]) {
        for (const farmer of farmers) {
            try {
                // Using INSERT OR REPLACE to handle both new and updated records
                await db.runAsync(`
                    INSERT OR REPLACE INTO farmers_local (
                        id, user_id, full_name, phone_number, email, 
                        registration_number, national_id, kyc_status, registration_completed,
                        address, physical_address, farm_location, gps_latitude, gps_longitude,
                        gender, number_of_cows, feeding_type, 
                        bank_account_name, bank_account_number, bank_name, bank_branch,
                        created_at, updated_at, synced_at, is_deleted
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
                `, [
                    farmer.id,
                    farmer.user_id,
                    farmer.full_name,
                    farmer.phone_number || farmer.phone,
                    farmer.email,
                    farmer.registration_number,
                    farmer.national_id,
                    farmer.kyc_status,
                    farmer.registration_completed ? 1 : 0,
                    farmer.address,
                    farmer.physical_address || farmer.address,
                    farmer.farm_location,
                    farmer.gps_latitude,
                    farmer.gps_longitude,
                    farmer.gender,
                    farmer.number_of_cows,
                    farmer.feeding_type,
                    farmer.bank_account_name,
                    farmer.bank_account_number,
                    farmer.bank_name,
                    farmer.bank_branch,
                    farmer.created_at,
                    farmer.updated_at
                ]);
            } catch (e) {
                console.error(`[SYNC] Failed to upsert farmer ${farmer.full_name}:`, e);
            }
        }
    },

    // Incremental sync (only changed records)
    async syncFarmerUpdates() {
        return this.syncFarmers('dummy_id', false);
    },

    // Get local farmer count
    async getFarmerCount() {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM farmers_local');
        return result?.count || 0;
    },

    // Search farmers locally
    async searchFarmersLocal(query: string) {
        const db = await getDatabase();
        if (!query) return await db.getAllAsync('SELECT * FROM farmers_local WHERE is_deleted = 0 ORDER BY full_name LIMIT 50');

        const results = await db.getAllAsync(
            `SELECT * FROM farmers_local 
             WHERE (full_name LIKE ? OR phone_number LIKE ? OR registration_number LIKE ?)
             AND is_deleted = 0
             ORDER BY full_name
             LIMIT 50`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );

        return results;
    }
};
