/**
 * Fast Upload Service
 * Optimized upload service with parallel processing and real-time progress tracking
 * Handles image upload to Supabase Storage while simultaneously running AI verification
 */

import { supabase } from '@/integrations/supabase/client';
import { optimizeImage, OptimizedImage } from '@/utils/image-optimizer';
import { verifyCollectionPhoto } from './ai/gemini-service';
import { verificationCache } from './verification-cache';
import { verificationAnalytics } from './verification-analytics';

export interface UploadProgress {
    stage: 'compressing' | 'uploading' | 'verifying' | 'saving' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
}

export interface FastUploadResult {
    success: boolean;
    uploadUrl?: string;
    storagePath?: string;
    verification?: {
        estimatedLiters: number;
        matchesRecorded: boolean;
        confidence: number;
        explanation: string;
        verificationPassed: boolean;
    };
    error?: string;
    timings?: {
        compression: number;
        upload: number;
        verification: number;
        total: number;
    };
}

export interface UploadOptions {
    farmerId: string;
    collectionId: string;
    recordedLiters: number;
    staffId?: string;
    onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload and verify milk collection photo with maximum speed
 */
export async function fastUploadAndVerify(
    file: File | Blob,
    options: UploadOptions
): Promise<FastUploadResult> {
    const startTime = Date.now();
    const timings = {
        compression: 0,
        upload: 0,
        verification: 0,
        total: 0,
    };

    try {
        // Stage 1: Compress image (0-20%)
        options.onProgress?.({
            stage: 'compressing',
            progress: 10,
            message: 'Optimizing image...',
        });

        const compressionStart = Date.now();
        const optimized = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
            format: 'webp',
            maxSizeKB: 800,
        });
        timings.compression = Date.now() - compressionStart;

        options.onProgress?.({
            stage: 'compressing',
            progress: 20,
            message: `Compressed ${optimized.compressionRatio.toFixed(0)}%`,
        });

        // Check cache first
        const cached = await verificationCache.get(optimized.hash, options.recordedLiters);
        if (cached) {
            console.log('Cache hit! Using cached verification result');

            // Still upload the image but return cached verification
            const uploadPromise = uploadToStorage(optimized.blob, options);

            options.onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Verified (cached)',
            });

            const uploadResult = await uploadPromise;

            timings.total = Date.now() - startTime;

            // Track cache hit analytics
            verificationAnalytics.track({
                timestamp: Date.now(),
                metrics: {
                    compressionTime: timings.compression,
                    uploadDuration: 0,
                    verificationLatency: 0,
                    totalTime: timings.total,
                    cacheHit: true,
                    imageSize: file.size,
                    optimizedSize: optimized.optimizedSize,
                    compressionRatio: optimized.compressionRatio,
                },
                collectionId: options.collectionId,
                farmerId: options.farmerId,
                success: true,
            });

            return {
                success: true,
                uploadUrl: uploadResult.url,
                storagePath: uploadResult.path,
                verification: cached.result,
                timings: {
                    ...timings,
                    total: timings.total,
                },
            };
        }

        // Stage 2 & 3: Parallel upload and verification (20-90%)
        options.onProgress?.({
            stage: 'uploading',
            progress: 30,
            message: 'Uploading and analyzing...',
        });

        const uploadStart = Date.now();
        const verificationStart = Date.now();

        // Run upload and verification in parallel
        const [uploadResult, verificationResult] = await Promise.all([
            uploadToStorage(optimized.blob, options, (uploadProgress) => {
                options.onProgress?.({
                    stage: 'uploading',
                    progress: 30 + uploadProgress * 0.3, // 30-60%
                    message: `Uploading ${uploadProgress.toFixed(0)}%...`,
                });
            }),
            verifyImage(optimized.blob, options, (verifyProgress) => {
                options.onProgress?.({
                    stage: 'verifying',
                    progress: 60 + verifyProgress * 0.3, // 60-90%
                    message: 'AI analyzing...',
                });
            }),
        ]);

        timings.upload = Date.now() - uploadStart;
        timings.verification = Date.now() - verificationStart;

        if (!verificationResult.success) {
            throw new Error(verificationResult.error || 'Verification failed');
        }

        // Cache the result
        await verificationCache.set(
            optimized.hash,
            options.recordedLiters,
            verificationResult.analysis!
        );

        // Stage 4: Save to database (90-100%)
        options.onProgress?.({
            stage: 'saving',
            progress: 95,
            message: 'Saving results...',
        });

        await saveVerificationResult(
            options.collectionId,
            verificationResult.analysis!,
            options.recordedLiters
        );

        options.onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Complete!',
        });

        timings.total = Date.now() - startTime;

        // Track analytics
        verificationAnalytics.track({
            timestamp: Date.now(),
            metrics: {
                compressionTime: timings.compression,
                uploadDuration: timings.upload,
                verificationLatency: timings.verification,
                totalTime: timings.total,
                cacheHit: false,
                imageSize: file.size,
                optimizedSize: optimized.optimizedSize,
                compressionRatio: optimized.compressionRatio,
            },
            collectionId: options.collectionId,
            farmerId: options.farmerId,
            success: true,
        });

        return {
            success: true,
            uploadUrl: uploadResult.url,
            storagePath: uploadResult.path,
            verification: verificationResult.analysis,
            timings,
        };
    } catch (error) {
        console.error('Fast upload error:', error);

        options.onProgress?.({
            stage: 'error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Upload failed',
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            timings: {
                ...timings,
                total: Date.now() - startTime,
            },
        };
    }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
    blob: Blob,
    options: UploadOptions,
    onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> {
    const fileName = `${options.farmerId}/${options.collectionId}_${Date.now()}.webp`;
    const filePath = `milk-collections/${fileName}`;

    // Simulate progress for small files (Supabase doesn't provide upload progress)
    const progressInterval = setInterval(() => {
        const currentProgress = Math.min(90, (Date.now() % 1000) / 10);
        onProgress?.(currentProgress);
    }, 100);

    try {
        const { data, error } = await supabase.storage
            .from('milk-collections')
            .upload(filePath, blob, {
                contentType: blob.type,
                upsert: false,
            });

        clearInterval(progressInterval);
        onProgress?.(100);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('milk-collections')
            .getPublicUrl(filePath);

        return {
            url: urlData.publicUrl,
            path: filePath,
        };
    } catch (error) {
        clearInterval(progressInterval);
        throw error;
    }
}

/**
 * Verify image with AI
 */
async function verifyImage(
    blob: Blob,
    options: UploadOptions,
    onProgress?: (progress: number) => void
): Promise<{
    success: boolean;
    analysis?: any;
    error?: string;
}> {
    // Simulate progress
    const progressInterval = setInterval(() => {
        const currentProgress = Math.min(90, (Date.now() % 2000) / 20);
        onProgress?.(currentProgress);
    }, 100);

    try {
        const result = await verifyCollectionPhoto(
            blob,
            options.recordedLiters,
            options.staffId || 'default_staff'
        );

        clearInterval(progressInterval);
        onProgress?.(100);

        return result;
    } catch (error) {
        clearInterval(progressInterval);
        throw error;
    }
}

/**
 * Save verification result to database
 */
async function saveVerificationResult(
    collectionId: string,
    result: any,
    recordedLiters: number
): Promise<void> {
    const { data, error } = await supabase
        .from('ai_verification_results')
        .insert([{
            collection_id: collectionId,
            estimated_liters: result.estimatedLiters,
            recorded_liters: recordedLiters,
            matches_recorded: result.matchesRecorded,
            confidence_score: result.confidence,
            explanation: result.explanation,
            verification_passed: result.verificationPassed,
            status: result.verificationPassed ? 'verified' : 'flagged',
        }])
        .select()
        .single();

    if (error) throw error;

    // Link verification to collection
    if (data) {
        await supabase
            .from('collections')
            .update({ ai_verification_id: data.id })
            .eq('id', collectionId);
    }
}

/**
 * Batch upload and verify multiple collections
 */
export async function batchUploadAndVerify(
    files: Array<{ file: File | Blob; options: UploadOptions }>,
    onBatchProgress?: (completed: number, total: number) => void
): Promise<FastUploadResult[]> {
    const results: FastUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const { file, options } = files[i];
        const result = await fastUploadAndVerify(file, options);
        results.push(result);
        onBatchProgress?.(i + 1, files.length);
    }

    return results;
}
