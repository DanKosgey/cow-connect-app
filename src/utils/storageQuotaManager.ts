/**
 * Storage Quota Manager
 * 
 * Utility functions to help manage browser storage quotas and prevent
 * QuotaExceededError exceptions when storing large data.
 */

/**
 * Check available storage quota (approximate)
 * @returns Promise with storage information
 */
export const checkStorageQuota = async (): Promise<{ 
  quota?: number; 
  usage?: number; 
  available?: number;
  supported: boolean;
}> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota && estimate.usage ? estimate.quota - estimate.usage : undefined,
        supported: true
      };
    } catch (error) {
      console.warn('Storage quota estimation not supported or failed:', error);
      return { supported: false };
    }
  }
  return { supported: false };
};

/**
 * Safely store data in localStorage with quota checking
 * @param key The key to store the data under
 * @param value The value to store
 * @returns boolean indicating success
 */
export const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014) {
      console.error(`QuotaExceededError: Failed to store data with key "${key}" - storage quota exceeded`);
      return false;
    }
    console.error('Error storing data in localStorage:', error);
    return false;
  }
};

/**
 * Get approximate size of data when stored in localStorage
 * @param data The data to measure
 * @returns Size in bytes
 */
export const getDataSize = (data: string): number => {
  // UTF-16 strings are 2 bytes per character
  return data.length * 2;
};

/**
 * Check if storing data would likely exceed quota
 * @param data The data to check
 * @returns Promise<boolean> indicating if storage would exceed quota
 */
export const wouldExceedQuota = async (data: string): Promise<boolean> => {
  const quotaInfo = await checkStorageQuota();
  
  if (!quotaInfo.supported || !quotaInfo.available) {
    // If we can't check quota, be conservative and assume it might exceed
    return getDataSize(data) > 1024 * 1024; // 1MB
  }
  
  return getDataSize(data) > quotaInfo.available * 0.8; // Use 80% of available space as threshold
};

/**
 * Store data in localStorage if it won't exceed quota
 * @param key The key to store the data under
 * @param value The value to store
 * @returns Promise<boolean> indicating success
 */
export const conditionalSetLocalStorage = async (key: string, value: string): Promise<boolean> => {
  if (await wouldExceedQuota(value)) {
    console.warn(`Data for key "${key}" is too large to store safely in localStorage`);
    return false;
  }
  
  return safeSetLocalStorage(key, value);
};

/**
 * Clean up old localStorage items to free up space
 * @param maxAgeInHours Maximum age of items to keep (in hours)
 */
export const cleanupOldStorageItems = (maxAgeInHours: number = 24): void => {
  const now = Date.now();
  const maxAgeInMs = maxAgeInHours * 60 * 60 * 1000;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Clean up pending items older than maxAge
      if (key.startsWith('pending_')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.createdAt) {
              const itemAge = now - new Date(parsed.createdAt).getTime();
              if (itemAge > maxAgeInMs) {
                localStorage.removeItem(key);
                // Only log cleanup in development
                if (import.meta.env.DEV) {
                  console.log(`Cleaned up old localStorage item: ${key}`);
                }
              }
            }
          }
        } catch (error) {
          // If we can't parse the item, remove it
          localStorage.removeItem(key);
        }
      }
    }
  }
};

export default {
  checkStorageQuota,
  safeSetLocalStorage,
  getDataSize,
  wouldExceedQuota,
  conditionalSetLocalStorage,
  cleanupOldStorageItems
};