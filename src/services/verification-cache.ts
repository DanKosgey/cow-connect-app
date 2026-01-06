/**
 * Verification Cache Service
 * Provides in-memory and IndexedDB caching for AI verification results
 * Prevents duplicate API calls and provides instant results for cached images
 */

interface CachedVerification {
    imageHash: string;
    recordedLiters: number;
    result: {
        estimatedLiters: number;
        matchesRecorded: boolean;
        confidence: number;
        explanation: string;
        verificationPassed: boolean;
    };
    timestamp: number;
    expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;
const DB_NAME = 'milk_verification_cache';
const DB_VERSION = 1;
const STORE_NAME = 'verifications';

class VerificationCache {
    private memoryCache: Map<string, CachedVerification> = new Map();
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initDB();
    }

    /**
     * Initialize IndexedDB
     */
    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                resolve(); // Continue without IndexedDB
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'imageHash' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            };
        });
    }

    /**
     * Generate cache key from image hash and recorded liters
     */
    private getCacheKey(imageHash: string, recordedLiters: number): string {
        return `${imageHash}_${recordedLiters}`;
    }

    /**
     * Get cached verification result
     */
    async get(imageHash: string, recordedLiters: number): Promise<CachedVerification | null> {
        const key = this.getCacheKey(imageHash, recordedLiters);
        const now = Date.now();

        // Check memory cache first
        const memCached = this.memoryCache.get(key);
        if (memCached && memCached.expiresAt > now) {
            return memCached;
        }

        // Check IndexedDB
        await this.initPromise;
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const cached = request.result as CachedVerification | undefined;

                if (cached && cached.expiresAt > now) {
                    // Refresh memory cache
                    this.memoryCache.set(key, cached);
                    resolve(cached);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Error reading from cache:', request.error);
                resolve(null);
            };
        });
    }

    /**
     * Set cached verification result
     */
    async set(
        imageHash: string,
        recordedLiters: number,
        result: CachedVerification['result']
    ): Promise<void> {
        const key = this.getCacheKey(imageHash, recordedLiters);
        const now = Date.now();

        const cached: CachedVerification = {
            imageHash: key,
            recordedLiters,
            result,
            timestamp: now,
            expiresAt: now + CACHE_DURATION,
        };

        // Set in memory cache
        this.memoryCache.set(key, cached);

        // Enforce max cache size
        if (this.memoryCache.size > MAX_CACHE_SIZE) {
            const oldestKey = Array.from(this.memoryCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.memoryCache.delete(oldestKey);
        }

        // Set in IndexedDB
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(cached);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error writing to cache:', request.error);
                resolve();
            };
        });
    }

    /**
     * Clear expired entries
     */
    async clearExpired(): Promise<void> {
        const now = Date.now();

        // Clear memory cache
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiresAt <= now) {
                this.memoryCache.delete(key);
            }
        }

        // Clear IndexedDB
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('expiresAt');
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                console.error('Error clearing expired cache:', request.error);
                resolve();
            };
        });
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        this.memoryCache.clear();

        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error clearing cache:', request.error);
                resolve();
            };
        });
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        memoryCacheSize: number;
        dbCacheSize: number;
        hitRate: number;
    }> {
        await this.initPromise;

        let dbSize = 0;
        if (this.db) {
            dbSize = await new Promise<number>((resolve) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.count();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
        }

        return {
            memoryCacheSize: this.memoryCache.size,
            dbCacheSize: dbSize,
            hitRate: 0, // TODO: Implement hit rate tracking
        };
    }
}

// Export singleton instance
export const verificationCache = new VerificationCache();

// Auto-clear expired entries every 5 minutes
setInterval(() => {
    verificationCache.clearExpired();
}, 5 * 60 * 1000);
