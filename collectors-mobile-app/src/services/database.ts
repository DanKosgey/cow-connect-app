
import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

import { Platform } from 'react-native';

export const getDatabase = async () => {
  if (dbInstance) return dbInstance;

  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    // Web support: Use localStorage as a simple key-value store
    if (Platform.OS === 'web') {
      console.log('🌐 [DB] Running on web - using localStorage backend');

      const webDb = {
        execAsync: async (sql: string) => {
          console.log('🌐 [DB] execAsync:', sql);
        },

        runAsync: async (sql: string, params: any[] = []) => {
          console.log('🌐 [DB] runAsync:', sql, params);

          // Parse INSERT/UPDATE/DELETE operations
          if (sql.includes('INSERT') || sql.includes('REPLACE')) {
            const tableName = sql.match(/INTO\s+(\w+)/i)?.[1] || 'unknown';
            const key = `sqlite_${tableName}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');

            // Simple insert - just append the record
            const record: any = {};
            const columns = sql.match(/\((.*?)\)/)?.[1].split(',').map(c => c.trim());
            columns?.forEach((col, i) => {
              record[col] = params[i];
            });

            existing.push(record);
            localStorage.setItem(key, JSON.stringify(existing));
            console.log(`✅ [DB] Saved to ${key}:`, record);

            return { lastInsertRowId: existing.length, changes: 1 };
          }

          return { lastInsertRowId: 0, changes: 0 };
        },

        getAllAsync: async (sql: string, params: any[] = []) => {
          console.log('🌐 [DB] getAllAsync:', sql, params);

          // Parse SELECT operations
          const tableName = sql.match(/FROM\s+(\w+)/i)?.[1] || 'unknown';
          const key = `sqlite_${tableName}`;
          const data = JSON.parse(localStorage.getItem(key) || '[]');

          console.log(`✅ [DB] Retrieved from ${key}:`, data.length, 'records');
          return data;
        },

        getFirstAsync: async (sql: string, params: any[] = []) => {
          console.log('🌐 [DB] getFirstAsync:', sql, params);

          const tableName = sql.match(/FROM\s+(\w+)/i)?.[1] || 'unknown';
          const key = `sqlite_${tableName}`;
          const data = JSON.parse(localStorage.getItem(key) || '[]');

          // Simple WHERE clause matching
          if (sql.includes('WHERE') && params.length > 0) {
            const whereColumn = sql.match(/WHERE\s+(\w+)/i)?.[1];
            const result = data.find((record: any) => record[whereColumn || ''] === params[0]);
            console.log(`✅ [DB] Found in ${key}:`, result);
            return result || null;
          }

          const result = data[0] || null;
          console.log(`✅ [DB] First from ${key}:`, result);
          return result;
        },

        closeAsync: async () => {
          console.log('🌐 [DB] closeAsync');
        },

        withTransactionAsync: async (cb: any) => {
          console.log('🌐 [DB] withTransactionAsync');
          return cb();
        },
      } as unknown as SQLite.SQLiteDatabase;

      dbInstance = webDb;
      return webDb;
    }

    try {
      console.log('🔵 [DB] Opening database...');
      const db = await SQLite.openDatabaseAsync('collectors.db');
      console.log('🔵 [DB] Database opened, initializing...');
      await initDatabase(db);
      dbInstance = db;
      return db;
    } catch (error) {
      console.error("❌ [DB] Failed to initialize database:", error);
      dbInitPromise = null;
      throw error;
    }
  })();

  return dbInitPromise;
};

const initDatabase = async (database: SQLite.SQLiteDatabase) => {
  console.log('🔵 [DB] Starting database initialization...');
  try {
    // Determine if we need to clean up first (optional, for debugging)
    // await database.execAsync('DROP TABLE IF EXISTS auth_cache'); 

    // Initialize tables one by one to isolate errors and avoid massive blocks
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS auth_cache (
        id INTEGER PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        staff_id TEXT,
        full_name TEXT,
        phone TEXT,
        last_login DATETIME,
        token TEXT,
        refresh_token TEXT,
        synced_at DATETIME
      );
    `);

    // --- MIGRATION CHECK ---
    // Check if farmers_local needs upgrade (if phone_number is missing)
    try {
      const check = await database.getAllAsync("PRAGMA table_info(farmers_local)");
      const hasPhoneCol = check.some((col: any) => col.name === 'phone_number');

      if (check.length > 0 && !hasPhoneCol) {
        console.log('⚠️ [DB] Old schema detected. Recreating farmers_local table...');
        await database.execAsync('DROP TABLE IF EXISTS farmers_local');
      }
    } catch (e) {
      console.log('[DB] Migration check failed (safe to ignore if first run)', e);
    }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS farmers_local (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        email TEXT,
        registration_number TEXT,
        national_id TEXT,
        kyc_status TEXT DEFAULT 'pending',
        registration_completed INTEGER DEFAULT 0,
        physical_address TEXT,
        farm_location TEXT,
        gps_latitude REAL,
        gps_longitude REAL,
        gender TEXT,
        number_of_cows INTEGER,
        feeding_type TEXT,
        bank_account_name TEXT,
        bank_account_number TEXT,
        bank_name TEXT,
        bank_branch TEXT,
        total_collections INTEGER DEFAULT 0,
        total_liters REAL DEFAULT 0,
        avg_quality_score REAL,
        last_collection_date DATETIME,
        created_at DATETIME,
        updated_at DATETIME,
        synced_at DATETIME,
        is_deleted INTEGER DEFAULT 0
      );
    `);

    // --- MIGRATION CHECK: collections_queue farmer_name ---
    try {
      const checkQueue = await database.getAllAsync("PRAGMA table_info(collections_queue)");
      const hasFarmerName = checkQueue.some((col: any) => col.name === 'farmer_name');

      if (checkQueue.length > 0 && !hasFarmerName) {
        console.log('⚠️ [DB] Adding farmer_name to collections_queue...');
        await database.execAsync('ALTER TABLE collections_queue ADD COLUMN farmer_name TEXT');
      }
    } catch (e) {
      console.log('[DB] Queue migration check failed', e);
    }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS collections_queue (
        local_id TEXT PRIMARY KEY,
        collection_id TEXT,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT,
        collector_id TEXT NOT NULL,
        liters REAL NOT NULL,
        rate REAL NOT NULL,
        total_amount REAL NOT NULL,
        collection_date DATETIME NOT NULL,
        gps_latitude REAL,
        gps_longitude REAL,
        notes TEXT,
        photo_local_uri TEXT,
        photo_uploaded INTEGER DEFAULT 0,
        verification_code TEXT,
        ai_verification_result TEXT,
        status TEXT DEFAULT 'pending_upload',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_at DATETIME,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        FOREIGN KEY (farmer_id) REFERENCES farmers_local(id)
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        entity_type TEXT NOT NULL,
        last_sync DATETIME,
        last_sync_version INTEGER DEFAULT 0,
        total_synced INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'idle'
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ [DB] Database tables initialized successfully');
  } catch (error) {
    console.error('❌ [DB] Database initialization FAILED:', error);
    throw error;
  }
};
