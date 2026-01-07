
import { supabase } from './supabase';
import { getDatabase } from './database';

export const farmerSyncService = {
    // Initial full sync
    async syncAllFarmers(collectorId: string) {
        const db = await getDatabase();

        try {
            // Fetch all approved farmers with analytics
            const { data: farmers, error } = await supabase
                .from('farmers')
                .select(`
          *,
          farmer_analytics (
            total_collections,
            total_liters,
            avg_quality_score,
            current_month_earnings,
            current_month_volume,
            last_collection_date
          )
        `)
                .eq('kyc_status', 'approved')
                .eq('is_active', true);

            if (error) throw error;

            // Perform database operations within a transaction
            await db.withTransactionAsync(async () => {
                // Clear and repopulate
                await db.runAsync('DELETE FROM farmers_local');

                for (const farmer of farmers || []) {
                    const analytics = farmer.farmer_analytics?.[0] || {};

                    await db.runAsync(
                        `INSERT INTO farmers_local 
               (id, full_name, phone, email, registration_number, national_id, kyc_status,
                farm_address, farm_location_lat, farm_location_lng,
                total_collections, total_liters, avg_quality_score, last_collection_date,
                created_at, updated_at, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [
                            farmer.id,
                            farmer.full_name,
                            farmer.phone,
                            farmer.email,
                            farmer.registration_number,
                            farmer.national_id,
                            farmer.kyc_status,
                            farmer.farm_address,
                            farmer.farm_location_lat,
                            farmer.farm_location_lng,
                            analytics.total_collections || 0,
                            analytics.total_liters || 0,
                            analytics.avg_quality_score || 0,
                            analytics.last_collection_date,
                            farmer.created_at,
                            farmer.updated_at,
                        ]
                    );
                }

                // Update sync metadata
                await db.runAsync(
                    `INSERT OR REPLACE INTO sync_metadata (entity_type, last_sync, total_synced, sync_status)
             VALUES ('farmers', CURRENT_TIMESTAMP, ?, 'completed')`,
                    [farmers ? farmers.length : 0]
                );
            });

            return { success: true, count: farmers ? farmers.length : 0 };
        } catch (error) {
            console.error('Farmer sync failed:', error);
            throw error;
        }
    },

    // Incremental sync (only changed records)
    async syncFarmerUpdates() {
        const db = await getDatabase();

        // Get last sync timestamp
        const lastSync: any = await db.getFirstAsync(
            "SELECT last_sync FROM sync_metadata WHERE entity_type = 'farmers'"
        );

        const lastSyncDate = lastSync?.last_sync || '2000-01-01';

        // Fetch only updated/new farmers
        const { data: farmers, error } = await supabase
            .from('farmers')
            .select('*')
            .eq('kyc_status', 'approved')
            .gte('updated_at', lastSyncDate);

        if (error) throw error;

        for (const farmer of farmers || []) {
            await db.runAsync(
                `INSERT OR REPLACE INTO farmers_local 
         (id, full_name, phone, email, registration_number, national_id, kyc_status,
          farm_address, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    farmer.id,
                    farmer.full_name,
                    farmer.phone,
                    farmer.email,
                    farmer.registration_number,
                    farmer.national_id,
                    farmer.kyc_status,
                    farmer.farm_address,
                    farmer.updated_at,
                ]
            );
        }

        // Update metadata
        if (farmers && farmers.length > 0) {
            await db.runAsync(
                `UPDATE sync_metadata 
         SET last_sync = CURRENT_TIMESTAMP, total_synced = total_synced + ?
         WHERE entity_type = 'farmers'`,
                [farmers.length]
            );
        }

        return { updated: farmers ? farmers.length : 0 };
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

        const results = await db.getAllAsync(
            `SELECT * FROM farmers_local 
       WHERE (full_name LIKE ? OR phone LIKE ? OR registration_number LIKE ?)
       AND is_deleted = 0
       ORDER BY full_name
       LIMIT 50`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );

        return results;
    },
};
