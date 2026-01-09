
import { supabase } from './supabase';
import { getDatabase } from './database';

export const farmerSyncService = {
    // Initial full sync
    // Flag to track sync status
    isSyncing: false,

    // Initial full sync
    async syncAllFarmers(collectorId: string) {
        if (this.isSyncing) {
            console.log('🔄 [SYNC] Farmer sync already in progress, skipping...');
            return { success: true, count: 0, skipped: true };
        }
        this.isSyncing = true;
        const db = await getDatabase();
        console.log('🔄 [SYNC] Starting full farmer sync...');

        try {
            // Fetch all farmers (filter by created_by if needed, or get all accessible)
            // Assuming collectors can see all farmers for now, or use RLS
            const { data: farmers, error } = await supabase
                .from('farmers')
                .select('*');

            if (error) {
                console.error('[SYNC] Error fetching farmers:', error);
                throw error;
            }

            console.log(`[SYNC] Downloaded ${farmers?.length} farmers from cloud.`);

            // Perform database operations within a transaction
            await db.withTransactionAsync(async () => {
                // Clear and repopulate to ensure fresh data
                await db.runAsync('DELETE FROM farmers_local');

                if (!farmers || farmers.length === 0) return;



                // For web compatibility or simpler SQLite usage, we'll loop and insert directly
                // simpler than managing prepared statements across platforms in this mock/shim
                for (const farmer of farmers) {
                    try {
                        await db.runAsync(`
                            INSERT INTO farmers_local (
                                id, 
                                user_id,
                                full_name, 
                                phone_number, 
                                email, 
                                registration_number, 
                                national_id, 
                                kyc_status,
                                registration_completed,
                                address,
                                physical_address,
                                farm_location,
                                gps_latitude,
                                gps_longitude,
                                gender,
                                number_of_cows,
                                feeding_type,
                                bank_account_name,
                                bank_account_number,
                                bank_name,
                                bank_branch,
                                created_at, 
                                updated_at, 
                                synced_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
                        console.error(`[SYNC] Failed to insert farmer ${farmer.full_name}:`, e);
                    }
                }

                // Update sync metadata
                await db.runAsync(
                    `INSERT OR REPLACE INTO sync_metadata (entity_type, last_sync, total_synced, sync_status)
                     VALUES ('farmers', CURRENT_TIMESTAMP, ?, 'completed')`,
                    [farmers.length]
                );
            });

            console.log('✅ [SYNC] Farmers sync completed successfully.');
            return { success: true, count: farmers ? farmers.length : 0 };
        } catch (error) {
            console.error('❌ [SYNC] Farmer sync failed:', error);
            // Don't throw logic error to prevent app crash, just return failure
            return { success: false, count: 0, error };
        }
    },

    // Incremental sync (only changed records)
    async syncFarmerUpdates() {
        // For simplicity, re-running full sync is safer for small datasets (< few thousand)
        // But here is the incremental structure if needed in future
        // For now, simpler to just run syncAllFarmers to guarantee consistency
        // especially since we just changed schema.
        return this.syncAllFarmers('dummy_id');
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
        if (!query) return await db.getAllAsync('SELECT * FROM farmers_local ORDER BY full_name LIMIT 50');

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
