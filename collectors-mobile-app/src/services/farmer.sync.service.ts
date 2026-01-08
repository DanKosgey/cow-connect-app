
import { supabase } from './supabase';
import { getDatabase } from './database';

export const farmerSyncService = {
    // Initial full sync
    async syncAllFarmers(collectorId: string) {
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

                const statement = await db.prepareAsync(`
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
                    ) VALUES (
                        $id, $user_id, $full_name, $phone_number, $email, $registration_number, 
                        $national_id, $kyc_status, $registration_completed, $physical_address, 
                        $farm_location, $gps_latitude, $gps_longitude, $gender, $number_of_cows, 
                        $feeding_type, $bank_account_name, $bank_account_number, $bank_name, 
                        $bank_branch, $created_at, $updated_at, CURRENT_TIMESTAMP
                    )
                `);

                for (const farmer of farmers) {
                    try {
                        await statement.executeAsync({
                            $id: farmer.id,
                            $user_id: farmer.user_id,
                            $full_name: farmer.full_name,
                            $phone_number: farmer.phone_number || farmer.phone, // Handle potential schema differences
                            $email: farmer.email,
                            $registration_number: farmer.registration_number,
                            $national_id: farmer.national_id,
                            $kyc_status: farmer.kyc_status,
                            $registration_completed: farmer.registration_completed ? 1 : 0,
                            $physical_address: farmer.physical_address || farmer.address,
                            $farm_location: farmer.farm_location,
                            $gps_latitude: farmer.gps_latitude,
                            $gps_longitude: farmer.gps_longitude,
                            $gender: farmer.gender,
                            $number_of_cows: farmer.number_of_cows,
                            $feeding_type: farmer.feeding_type,
                            $bank_account_name: farmer.bank_account_name,
                            $bank_account_number: farmer.bank_account_number,
                            $bank_name: farmer.bank_name,
                            $bank_branch: farmer.bank_branch,
                            $created_at: farmer.created_at,
                            $updated_at: farmer.updated_at
                        });
                    } catch (e) {
                        console.error(`[SYNC] Failed to insert farmer ${farmer.full_name}:`, e);
                    }
                }

                await statement.finalizeAsync();

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
