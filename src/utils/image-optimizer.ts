/**
 * Image Optimization Utility
 * Compresses and optimizes images for fast upload and AI verification
 * Target: Reduce file size by 70-80% while maintaining quality for AI analysis
 */

export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
    maxSizeKB?: number;
}

export interface OptimizedImage {
    blob: Blob;
    dataUrl: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
    hash: string;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'webp',
    maxSizeKB: 800,
};

/**
 * Generate a simple hash from image data for deduplication
 */
async function generateImageHash(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Simple hash using first 1KB of data
    let hash = 0;
    const sampleSize = Math.min(1024, uint8Array.length);
    for (let i = 0; i < sampleSize; i++) {
        hash = ((hash << 5) - hash) + uint8Array[i];
        hash = hash & hash; // Convert to 32bit integer
    }

    return `${hash}_${blob.size}_${blob.type}`;
}

/**
 * Optimize an image file for upload and AI verification
 */
export async function optimizeImage(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            const img = new Image();

            img.onload = async () => {
                try {
                    // Calculate new dimensions maintaining aspect ratio
                    let { width, height } = img;

                    if (width > opts.maxWidth! || height > opts.maxHeight!) {
                        const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        throw new Error('Failed to get canvas context');
                    }

                    // Use high-quality image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try to compress to target size
                    let quality = opts.quality!;
                    let blob: Blob | null = null;
                    let attempts = 0;
                    const maxAttempts = 5;

                    while (attempts < maxAttempts) {
                        blob = await new Promise<Blob | null>((res) => {
                            canvas.toBlob(
                                (b) => res(b),
                                opts.format === 'webp' ? 'image/webp' : 'image/jpeg',
                                quality
                            );
                        });

                        if (!blob) {
                            throw new Error('Failed to create blob from canvas');
                        }

                        // Check if we've reached target size
                        const sizeKB = blob.size / 1024;
                        if (sizeKB <= opts.maxSizeKB! || quality <= 0.5) {
                            break;
                        }

                        // Reduce quality for next attempt
                        quality -= 0.1;
                        attempts++;
                    }

                    if (!blob) {
                        throw new Error('Failed to optimize image');
                    }

                    // Generate data URL for preview
                    const dataUrl = canvas.toDataURL(
                        opts.format === 'webp' ? 'image/webp' : 'image/jpeg',
                        quality
                    );

                    // Generate hash for deduplication
                    const hash = await generateImageHash(blob);

                    const result: OptimizedImage = {
                        blob,
                        dataUrl,
                        originalSize,
                        optimizedSize: blob.size,
                        compressionRatio: ((originalSize - blob.size) / originalSize) * 100,
                        width,
                        height,
                        hash,
                    };

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Batch optimize multiple images
 */
export async function optimizeImages(
    files: (File | Blob)[],
    options: ImageOptimizationOptions = {}
): Promise<OptimizedImage[]> {
    return Promise.all(files.map(file => optimizeImage(file, options)));
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
        const webP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
        const img = new Image();
        img.onload = () => resolve(img.width === 1);
        img.onerror = () => resolve(false);
        img.src = webP;
    });
}

/**
 * Get optimal format based on browser support
 */
export async function getOptimalFormat(): Promise<'webp' | 'jpeg'> {
    const hasWebP = await supportsWebP();
    return hasWebP ? 'webp' : 'jpeg';
}
