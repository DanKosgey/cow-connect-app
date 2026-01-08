
import { getDatabase } from './database';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

interface CollectionInput {
    farmerId: string;
    farmerName: string; // Added field
    collectorId: string;
    liters: number;
    rate: number;
    gpsLatitude?: number;
    gpsLongitude?: number;
    notes?: string;
    photoUri?: string;
}

export const collectionLocalService = {
    // Save collection locally
    async createCollectionLocal(input: CollectionInput) {
        const db = await getDatabase();

        try {
            // Generate IDs
            const timestamp = Date.now();
            const suffix = Math.random().toString(36).substr(2, 5).toUpperCase(); // 5 chars upper
            const collectionId = `COL-${timestamp}-${suffix}`;
            const verificationCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // 6 chars upper

            const totalAmount = parseFloat((input.liters * input.rate).toFixed(2));

            // Copy photo to app directory if provided
            let localPhotoPath = null;
            if (input.photoUri) {
                const photoDir = `${FileSystem.documentDirectory}collection_photos/`;
                await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });

                const photoFilename = `${collectionId}.jpg`;
                localPhotoPath = `${photoDir}${photoFilename}`;

                await FileSystem.copyAsync({
                    from: input.photoUri,
                    to: localPhotoPath,
                });
            }

            // Insert into queue
            // We need a local_id for internal sync tracking, but the main collection_id is what we send up
            const localId = Crypto.randomUUID();

            await db.runAsync(
                `INSERT INTO collections_queue 
         (local_id, collection_id, farmer_id, farmer_name, collector_id, liters, rate, total_amount,
          collection_date, gps_latitude, gps_longitude, notes, photo_local_uri, verification_code, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 'pending_upload')`,
                [
                    localId,
                    collectionId,
                    input.farmerId,
                    input.farmerName || 'Unknown', // Save name
                    input.collectorId,
                    input.liters,
                    input.rate,
                    totalAmount,
                    input.gpsLatitude || null,
                    input.gpsLongitude || null,
                    input.notes || null,
                    localPhotoPath,
                    verificationCode
                ]
            );

            return { collectionId, verificationCode };
        } catch (error) {
            console.error('Failed to create local collection:', error);
            throw error;
        }
    },

    // Get pending upload count
    async getPendingCount(collectorId?: string) {
        const db = await getDatabase();
        if (collectorId) {
            const result = await db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM collections_queue WHERE status = 'pending_upload' AND collector_id = ?",
                [collectorId]
            );
            return result?.count || 0;
        } else {
            const result = await db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM collections_queue WHERE status = 'pending_upload'"
            );
            return result?.count || 0;
        }
    },

    // Get recent collections for display (limit 5)
    async getRecentCollections(collectorId?: string) {
        const db = await getDatabase();
        // Use COALESCE to prefer the name stored in collection, fallback to joined name
        const query = `
            SELECT cq.*, 
            COALESCE(cq.farmer_name, f.full_name, 'Unknown Farmer') as farmer_name, 
            f.registration_number
            FROM collections_queue cq
            LEFT JOIN farmers_local f ON cq.farmer_id = f.id
            ${collectorId ? 'WHERE cq.collector_id = ?' : ''}
            ORDER BY cq.created_at DESC
            LIMIT 5
        `;

        if (collectorId) {
            return await db.getAllAsync(query, [collectorId]);
        } else {
            return await db.getAllAsync(query);
        }
    },


    // Get recent farmers for quick selection
    async getRecentFarmers(collectorId: string, limit: number = 10) {
        const db = await getDatabase();
        // Select distinct farmers from collections, joined with farmer details
        // Order by most recent collection
        return await db.getAllAsync(
            `SELECT DISTINCT f.*, MAX(cq.created_at) as last_interaction
             FROM collections_queue cq
             JOIN farmers_local f ON cq.farmer_id = f.id
             WHERE cq.collector_id = ?
             GROUP BY f.id
             ORDER BY last_interaction DESC
             LIMIT ?`,
            [collectorId, limit]
        );
    }
};

