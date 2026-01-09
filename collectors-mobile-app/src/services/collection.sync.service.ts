
import { supabase } from './supabase';
import { getDatabase } from './database';
import * as FileSystem from 'expo-file-system/legacy';

// Polyfill atob if not present (though Hermes has it mostly)
const atob = (input: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs = 0, buffer, i = 0;
        buffer = str.charAt(i++);

        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
        buffer = chars.indexOf(buffer);
    }

    return output;
};


export const collectionSyncService = {
    // Upload pending collections (BATCHED)
    async uploadPendingCollections() {
        const db = await getDatabase();

        // 1. Auth Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.id) {
            console.warn('⚠️ [SYNC] No authenticated user found. Skipping upload.');
            return { success: 0, failed: 0, errors: [] };
        }

        // 1b. Resolve Staff ID (Fix for FK Error)
        const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!staff || !staff.id) {
            console.error('❌ [SYNC] Critical: Authenticated user is not linked to a Staff profile.');
            return { success: 0, failed: 1, errors: [{ error: 'User has no staff profile' }] };
        }

        // 2. Fetch Pending
        const pending: any[] = await db.getAllAsync(
            "SELECT * FROM collections_queue WHERE status = 'pending_upload' ORDER BY created_at ASC"
        );

        if (pending.length === 0) return { success: 0, failed: 0, errors: [] };
        console.log(`🚀 [SYNC] Found ${pending.length} pending collections. Staff ID: ${staff.id}`);

        const results = { success: 0, failed: 0, errors: [] as any[] };
        const BATCH_SIZE = 50; // Supabase batch limit suggestion

        // Process in chunks of 50 to avoid payload limits
        for (let i = 0; i < pending.length; i += BATCH_SIZE) {
            const batch = pending.slice(i, i + BATCH_SIZE);
            console.log(`📦 [SYNC] Processing batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);

            try {
                // Step A: Parallel Photo Uploads (Limit concurrency to 3)
                // Note: We use user.id for Storage paths (bucket/uid/...)
                const collectionsWithPhotos = await this.uploadPhotosConcurrent(batch, user.id);

                // Step B: Prepare Supabase Payloads
                const serverPayloads = collectionsWithPhotos.map(c => ({
                    collection_id: c.collection_id,
                    farmer_id: c.farmer_id,
                    staff_id: staff.id, // FIX: Use the resolved Staff ID, not User ID
                    liters: c.liters,
                    rate_per_liter: c.rate,
                    total_amount: c.total_amount,
                    collection_date: c.collection_date,
                    gps_latitude: c.gps_latitude,
                    gps_longitude: c.gps_longitude,
                    notes: c.notes,
                    photo_url: c.photo_url || null, // Updated from upload step
                    verification_code: c.verification_code,
                    status: 'Collected',
                    created_at: c.created_at,
                }));

                // Step C: Bulk Upsert to Supabase
                const { error } = await supabase
                    .from('collections')
                    .upsert(serverPayloads, { onConflict: 'collection_id' });

                if (error) throw error;

                // Step D: Bulk Local Update & Cleanup
                await this.finalizeBatch(db, batch);

                results.success += batch.length;
                console.log(`✅ [SYNC] Batch ${i / BATCH_SIZE + 1} completed successfully.`);

            } catch (error: any) {
                console.error(`❌ [SYNC] Batch failed:`, error);
                results.failed += batch.length;
                results.errors.push({ batchIndex: i, error });

                // Update retry counts for this batch
                const localIds = batch.map(c => `'${c.local_id}'`).join(',');
                await db.runAsync(
                    `UPDATE collections_queue SET retry_count = retry_count + 1, error_message = ? WHERE local_id IN (${localIds})`,
                    [error.message]
                );
            }
        }

        return results;
    },

    // Helper: Upload Photos with Concurrency Limit
    async uploadPhotosConcurrent(collections: any[], userId: string) {
        // We will mutate the collection objects to add 'photo_url'
        const queue = [...collections];
        const CONCURRENCY = 3;
        const results = [];

        const worker = async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (!item) break;

                if (item.photo_local_uri && !item.photo_uploaded) {
                    try {
                        item.photo_url = await this.uploadPhoto(item, userId);
                    } catch (e) {
                        console.warn(`⚠️ [SYNC] Photo upload failed for ${item.collection_id}, proceeding without photo.`);
                        item.photo_url = null; // Proceed without photo rather than failing batch
                    }
                }
                results.push(item);
            }
        };

        const workers = Array(Math.min(collections.length, CONCURRENCY)).fill(null).map(() => worker());
        await Promise.all(workers);
        return collections;
    },

    // Helper: Bulk Local Update & Delete Photos
    async finalizeBatch(db: any, batch: any[]) {
        const localIds = batch.map(c => `'${c.local_id}'`).join(',');

        // 1. Mark as uploaded
        await db.runAsync(
            `UPDATE collections_queue 
             SET status = 'uploaded', uploaded_at = CURRENT_TIMESTAMP 
             WHERE local_id IN (${localIds})`
        );

        // 2. Delete local photos
        const deletePromises = batch
            .filter(c => c.photo_local_uri)
            .map(async (c) => {
                try {
                    const info = await FileSystem.getInfoAsync(c.photo_local_uri);
                    if (info.exists) {
                        await FileSystem.deleteAsync(c.photo_local_uri);
                    }
                } catch (e) {
                    console.warn(`⚠️ [SYNC] Failed to delete local photo ${c.photo_local_uri}`);
                }
            });

        await Promise.all(deletePromises);
    },

    // Upload Single Photo (Unchanged logic, just separated)
    async uploadPhoto(collection: any, userId: string) {
        if (!collection.photo_local_uri) return null;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(collection.photo_local_uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const fileName = `${collection.collection_id}.jpg`;
        const filePath = `${userId}/${fileName}`;

        // Upload
        const { error } = await supabase.storage
            .from('milk-collections')
            .upload(filePath, decode(base64), {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (error) throw error;

        // Get URL
        const { data } = supabase.storage.from('milk-collections').getPublicUrl(filePath);
        return data.publicUrl;
    },
};

// Base64 decode helper
function decode(base64: string): Uint8Array {
    // Use global atob or local polyfill
    const binaryString = (global.atob || atob)(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
