
import { getDatabase } from './database';
import { supabase } from './supabase';

export interface MilkRate {
    id: number;
    rate_per_liter: number;
    is_active: boolean;
    effective_from: string;
}

export const milkRateService = {
    // Initialize milk rates table for local cache
    async init() {
        const db = await getDatabase();
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS milk_rates_local (
                id INTEGER PRIMARY KEY,
                rate_per_liter REAL NOT NULL,
                is_active BOOLEAN,
                effective_from TEXT,
                updated_at TEXT
            );
        `);
    },

    // Sync milk rates from Supabase
    async syncRates() {
        try {
            console.log('[MILK_RATES] Syncing milk rates from Supabase...');
            const { data: rates, error } = await supabase
                .from('milk_rates')
                .select('*')
                .eq('is_active', true);

            if (error) {
                console.error('[MILK_RATES] Supabase error:', error);
                throw error;
            }

            if (rates && rates.length > 0) {
                await this.updateLocalRates(rates);
                console.log(`[MILK_RATES] Synced ${rates.length} active milk rates`);
            } else {
                console.log('[MILK_RATES] No active milk rates found on server');
            }

        } catch (error) {
            console.error('[MILK_RATES] Failed to sync milk rates:', error);
        }
    },

    async getCurrentRate(): Promise<number> {
        const db = await getDatabase();

        // Try local first
        const localRate = await db.getFirstAsync<{ rate_per_liter: number }>(`
            SELECT rate_per_liter FROM milk_rates_local 
            WHERE is_active = 1 
            ORDER BY effective_from DESC 
            LIMIT 1
        `);

        if (localRate) {
            return localRate.rate_per_liter;
        }

        // Default fallback (farmer rate)
        return 50.00;
    },

    async updateLocalRates(rates: any[]) {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM milk_rates_local'); // Clear old cache
        for (const rate of rates) {
            await db.runAsync(
                'INSERT INTO milk_rates_local (id, rate_per_liter, is_active, effective_from) VALUES (?, ?, ?, ?)',
                [rate.id, rate.rate_per_liter, rate.is_active ? 1 : 0, rate.effective_from]
            );
        }
    }
};
