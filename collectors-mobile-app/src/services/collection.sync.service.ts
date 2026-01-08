
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
    // Upload pending collections
    async uploadPendingCollections() {
        const db = await getDatabase();

        // cast to any[] or specific type
        const pending: any[] = await db.getAllAsync(
            "SELECT * FROM collections_queue WHERE status = 'pending_upload' ORDER BY created_at ASC"
        );

        console.log(`🚀 [SYNC] Found ${pending.length} pending collections to upload`);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[],
        };

        for (const collection of pending) {
            console.log(`🔄 [SYNC] Processing collection ${collection.collection_id} (Local ID: ${collection.local_id})`);
            try {
                await this.uploadSingleCollection(collection);
                results.success++;

                // Mark as uploaded
                console.log(`✅ [SYNC] Collection ${collection.collection_id} uploaded successfully`);
                await db.runAsync(
                    `UPDATE collections_queue 
           SET status = 'uploaded', uploaded_at = CURRENT_TIMESTAMP 
           WHERE local_id = ?`,
                    [collection.local_id]
                );
            } catch (error: any) {
                console.error(`❌ [SYNC] Failed to upload collection ${collection.collection_id}:`, error);
                results.failed++;
                results.errors.push({ collectionId: collection.collection_id, error });

                // Increment retry count
                await db.runAsync(
                    `UPDATE collections_queue 
           SET retry_count = retry_count + 1, error_message = ? 
           WHERE local_id = ?`,
                    [error.message, collection.local_id]
                );
            }
        }

        return results;
    },

    // Upload single collection
    async uploadSingleCollection(collection: any) {
        let photoUrl = null;

        // Upload photo first if exists
        if (collection.photo_local_uri && !collection.photo_uploaded) {
            photoUrl = await this.uploadPhoto(collection);
        }

        // Get staff record
        // Get staff record using maybeSingle() to avoid 406 errors
        const { data: staffData } = await supabase
            .from('staff')
            .select('id')
            .eq('id', collection.collector_id)
            .maybeSingle();

        // Use fetched ID or fallback to local ID (assuming it's valid)
        const validStaffId = staffData?.id || collection.collector_id;

        // Insert collection
        console.log(`📝 [SYNC] Inserting collection record to Supabase for ${collection.collection_id}...`);
        const { data, error } = await supabase
            .from('collections')
            .upsert({
                collection_id: collection.collection_id,
                farmer_id: collection.farmer_id,
                staff_id: validStaffId,
                liters: collection.liters,
                rate_per_liter: collection.rate,
                total_amount: collection.total_amount,
                collection_date: collection.collection_date,
                gps_latitude: collection.gps_latitude,
                gps_longitude: collection.gps_longitude,
                notes: collection.notes,
                photo_url: photoUrl,
                verification_code: collection.verification_code,
                status: 'Collected',
                created_at: collection.created_at,
            }, { onConflict: 'collection_id' })
            .select()
            .single();

        if (error) {
            console.error(`❌ [SYNC] Supabase Insert Error:`, error);
            throw error;
        }

        console.log(`✨ [SYNC] Inserted record ID:`, data.id);

        return data;
    },

    // Upload photo to Supabase Storage
    async uploadPhoto(collection: any) {
        if (!collection.photo_local_uri) return null;

        try {
            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(collection.photo_local_uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const fileName = `${collection.collection_id}.jpg`;
            const filePath = `public/collection-photos/${collection.collector_id}/${fileName}`;

            // Upload to Supabase Storage
            // Use helper decode function to convert base64 to Uint8Array
            const { data, error } = await supabase.storage
                .from('milk-collections')
                .upload(filePath, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                console.error(`❌ [SYNC] Photo upload error for ${fileName}:`, error);
                // Return null so we can still upload the collection record without the photo
                return null;
            }

            console.log(`📸 [SYNC] Photo uploaded successfully: ${fileName}`);

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('milk-collections')
                .getPublicUrl(filePath);

            // Mark photo as uploaded
            const db = await getDatabase();
            await db.runAsync(
                'UPDATE collections_queue SET photo_uploaded = 1 WHERE local_id = ?',
                [collection.local_id]
            );

            return urlData.publicUrl;
        } catch (error) {
            console.error('Photo upload failed:', error);
            // Don't fail the entire collection if photo upload fails
            return null;
        }
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
