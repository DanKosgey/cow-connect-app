import { useState, useEffect, useCallback } from 'react';

interface CollectionRecord {
  id: string;
  farmerId: string;
  farmerName: string;
  staffId: string;
  liters: number;
  gpsLatitude: number;
  gpsLongitude: number;
  validationCode: string;
  qualityGrade: string;
  temperature: number | null;
  timestamp: string;
  synced: boolean;
}

interface FarmerRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  nationalId: string;
}

const DB_NAME = 'DairyChainDB';
const DB_VERSION = 1;
const COLLECTIONS_STORE = 'collections';
const FARMERS_STORE = 'farmers';

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create collections store
        if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
          const collectionsStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id' });
          collectionsStore.createIndex('farmerId', 'farmerId', { unique: false });
          collectionsStore.createIndex('synced', 'synced', { unique: false });
          collectionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create farmers store
        if (!db.objectStoreNames.contains(FARMERS_STORE)) {
          const farmersStore = db.createObjectStore(FARMERS_STORE, { keyPath: 'id' });
          farmersStore.createIndex('name', 'name', { unique: false });
          farmersStore.createIndex('phone', 'phone', { unique: false });
          farmersStore.createIndex('nationalId', 'nationalId', { unique: false });
        }
      };
    });
  }

  async addCollection(collection: CollectionRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    await store.add(collection);
  }

  async updateCollection(collection: CollectionRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    await store.put(collection);
  }

  async getUnsyncedCollections(): Promise<CollectionRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CollectionRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  async markCollectionAsSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const collection = getRequest.result;
      if (collection) {
        collection.synced = true;
        store.put(collection);
      }
    };
  }

  async addFarmer(farmer: FarmerRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([FARMERS_STORE], 'readwrite');
    const store = transaction.objectStore(FARMERS_STORE);
    await store.add(farmer);
  }

  async searchFarmers(query: string): Promise<FarmerRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([FARMERS_STORE], 'readonly');
    const store = transaction.objectStore(FARMERS_STORE);
    
    const results: FarmerRecord[] = [];
    
    // Search by name
    const nameIndex = store.index('name');
    const nameRequest = nameIndex.getAll();
    
    return new Promise((resolve, reject) => {
      nameRequest.onsuccess = () => {
        const farmers = nameRequest.result as FarmerRecord[];
        const filtered = farmers.filter(farmer => 
          farmer.name.toLowerCase().includes(query.toLowerCase()) ||
          farmer.phone.includes(query) ||
          farmer.nationalId.includes(query)
        );
        resolve(filtered);
      };
      nameRequest.onerror = () => reject(nameRequest.error);
    });
  }

  async getAllFarmers(): Promise<FarmerRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([FARMERS_STORE], 'readonly');
    const store = transaction.objectStore(FARMERS_STORE);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as FarmerRecord[]);
      request.onerror = () => reject(request.error);
    });
  }
}

const dbService = new IndexedDBService();

export const useIndexedDB = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        await dbService.init();
        setIsInitialized(true);
      } catch (err) {
        setError('Failed to initialize IndexedDB');
        console.error('IndexedDB initialization error:', err);
      }
    };

    initDB();
  }, []);

  const addCollection = useCallback(async (collection: CollectionRecord) => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.addCollection(collection);
  }, [isInitialized]);

  const updateCollection = useCallback(async (collection: CollectionRecord) => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.updateCollection(collection);
  }, [isInitialized]);

  const getUnsyncedCollections = useCallback(async (): Promise<CollectionRecord[]> => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.getUnsyncedCollections();
  }, [isInitialized]);

  const markCollectionAsSynced = useCallback(async (id: string) => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.markCollectionAsSynced(id);
  }, [isInitialized]);

  const addFarmer = useCallback(async (farmer: FarmerRecord) => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.addFarmer(farmer);
  }, [isInitialized]);

  const searchFarmers = useCallback(async (query: string): Promise<FarmerRecord[]> => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.searchFarmers(query);
  }, [isInitialized]);

  const getAllFarmers = useCallback(async (): Promise<FarmerRecord[]> => {
    if (!isInitialized) throw new Error('Database not initialized');
    return dbService.getAllFarmers();
  }, [isInitialized]);

  return {
    isInitialized,
    error,
    addCollection,
    updateCollection,
    getUnsyncedCollections,
    markCollectionAsSynced,
    addFarmer,
    searchFarmers,
    getAllFarmers
  };
};