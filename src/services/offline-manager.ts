import { openDB, IDBPDatabase } from 'idb';
import { Collection, Payment, QualityTest } from '@/types/staff.types';

interface OfflineAction {
  id: string;
  type: 'collection' | 'payment' | 'quality';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'error';
  error?: string;
}

class OfflineManager {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'staff-offline-db';
  private readonly DB_VERSION = 1;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.initDB();
    this.setupListeners();
  }

  private async initDB() {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create stores for different types of data
          db.createObjectStore('collections', { keyPath: 'id' });
          db.createObjectStore('payments', { keyPath: 'id' });
          db.createObjectStore('quality-tests', { keyPath: 'id' });
          db.createObjectStore('offline-actions', { keyPath: 'id' });
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Store offline actions
  async storeOfflineAction(type: 'collection' | 'payment' | 'quality', data: any): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    await this.db.put('offline-actions', action);
    return action.id;
  }

  // Store collection for offline access
  async storeCollection(collection: Collection) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('collections', collection);
  }

  // Store payment for offline access
  async storePayment(payment: Payment) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('payments', payment);
  }

  // Store quality test for offline access
  async storeQualityTest(test: QualityTest) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('quality-tests', test);
  }

  // Get all pending offline actions
  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllFromIndex('offline-actions', 'status', 'pending');
  }

  // Sync all offline actions when back online
  async syncOfflineActions() {
    if (!this.isOnline || this.syncInProgress) return;
    
    this.syncInProgress = true;
    const actions = await this.getPendingActions();
    
    for (const action of actions) {
      try {
        action.status = 'syncing';
        await this.db?.put('offline-actions', action);

        // Attempt to sync based on action type
        switch (action.type) {
          case 'collection':
            await this.syncCollection(action.data);
            break;
          case 'payment':
            await this.syncPayment(action.data);
            break;
          case 'quality':
            await this.syncQualityTest(action.data);
            break;
        }

        // Remove successfully synced action
        await this.db?.delete('offline-actions', action.id);
      } catch (error) {
        action.status = 'error';
        action.error = error instanceof Error ? error.message : 'Sync failed';
        await this.db?.put('offline-actions', action);
      }
    }

    this.syncInProgress = false;
  }

  private async syncCollection(data: Collection) {
    // Implement the actual sync logic with the server
    // This would typically involve making API calls to your backend
  }

  private async syncPayment(data: Payment) {
    // Implement payment sync logic
  }

  private async syncQualityTest(data: QualityTest) {
    // Implement quality test sync logic
  }

  // Get cached data for offline access
  async getCachedCollections(): Promise<Collection[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll('collections');
  }

  async getCachedPayments(): Promise<Payment[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll('payments');
  }

  async getCachedQualityTests(): Promise<QualityTest[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll('quality-tests');
  }

  // Clear all offline data (use with caution)
  async clearOfflineData() {
    if (!this.db) throw new Error('Database not initialized');
    await Promise.all([
      this.db.clear('collections'),
      this.db.clear('payments'),
      this.db.clear('quality-tests'),
      this.db.clear('offline-actions')
    ]);
  }

  // Get sync status
  async getSyncStatus() {
    const pendingActions = await this.getPendingActions();
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingActionsCount: pendingActions.length
    };
  }
}

export const offlineManager = new OfflineManager();