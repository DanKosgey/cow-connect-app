
import { getDatabase } from './database';
import { supabase } from './supabase';

export interface CollectorRate {
    id: number;
    rate_per_liter: number;
    is_active: boolean;
    effective_from: string;
}

export const collectorRateService = {
    // Initialize rates table if not exists (usually handled in migrations, but for local cache)
    async init() {
        const db = await getDatabase();
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS collector_rates_local (
                id INTEGER PRIMARY KEY,
                rate_per_liter REAL NOT NULL,
                is_active BOOLEAN,
                effective_from TEXT,
                updated_at TEXT
            );
        `);
    },

    // Sync rates from Supabase (or just mock for now if we don't have direct supabase sync setup for this table yet)
    // Given the user provided the table data JSON, I will blindly trust that data for now or try to fetch it.
    // However, the best approach is to fetch from the 'collector_rates' table in Supabase.



    // Sync rates from Supabase
    async syncRates() {
        try {
            console.log('[RATES] Syncing rates from Supabase...');
            const { data: rates, error } = await supabase
                .from('collector_rates')
                .select('*')
                .eq('is_active', true);

            if (error) {
                console.error('[RATES] Supabase error:', error);
                throw error;
            }

            if (rates && rates.length > 0) {
                await this.updateLocalRates(rates);
                console.log(`[RATES] Synced ${rates.length} active rates`);
            } else {
                console.log('[RATES] No active rates found on server');
                // Optional: Keep existing local rates if server returns empty? 
                // For now, trusting server is truth.
            }

        } catch (error) {
            console.error('[RATES] Failed to sync rates:', error);
            // Fallback to mock for demo if completely failing (e.g. offline)
            // But usually we rely on local cache if sync fails.
        }
    },

    async getCurrentRate(): Promise<number> {
        const db = await getDatabase();

        // Try local first
        const localRate = await db.getFirstAsync<{ rate_per_liter: number }>(`
            SELECT rate_per_liter FROM collector_rates_local 
            WHERE is_active = 1 
            ORDER BY effective_from DESC 
            LIMIT 1
        `);

        if (localRate) {
            return localRate.rate_per_liter;
        }

        // Default fallback
        return 30.00;
    },

    async updateLocalRates(rates: any[]) {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM collector_rates_local'); // Clear old cache
        for (const rate of rates) {
            await db.runAsync(
                'INSERT INTO collector_rates_local (id, rate_per_liter, is_active, effective_from) VALUES (?, ?, ?, ?)',
                [rate.id, rate.rate_per_liter, rate.is_active ? 1 : 0, rate.effective_from]
            );
        }
    }
};
