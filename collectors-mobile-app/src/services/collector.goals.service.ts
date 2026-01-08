
import { getDatabase } from './database';

export interface CollectorGoals {
    dailyLiterTarget: number;
    monthlyEarningsTarget: number;
    dailyCollectionCountTarget: number;
}

const DEFAULT_GOALS: CollectorGoals = {
    dailyLiterTarget: 200,
    monthlyEarningsTarget: 15000,
    dailyCollectionCountTarget: 15
};

export const collectorGoalsService = {
    async getGoals(): Promise<CollectorGoals> {
        const db = await getDatabase();
        try {
            const result = await db.getAllAsync('SELECT key, value FROM app_settings WHERE key LIKE "goal_%"');

            const goals = { ...DEFAULT_GOALS };

            result.forEach((row: any) => {
                const key = row.key.replace('goal_', '');
                if (key === 'dailyLiterTarget') goals.dailyLiterTarget = parseFloat(row.value);
                if (key === 'monthlyEarningsTarget') goals.monthlyEarningsTarget = parseFloat(row.value);
                if (key === 'dailyCollectionCountTarget') goals.dailyCollectionCountTarget = parseFloat(row.value);
            });

            return goals;
        } catch (e) {
            console.error('Failed to get goals', e);
            return DEFAULT_GOALS;
        }
    },

    async saveGoals(goals: CollectorGoals): Promise<void> {
        const db = await getDatabase();

        // Upsert queries
        const queries = [
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('goal_dailyLiterTarget', ?, CURRENT_TIMESTAMP)`,
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('goal_monthlyEarningsTarget', ?, CURRENT_TIMESTAMP)`,
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('goal_dailyCollectionCountTarget', ?, CURRENT_TIMESTAMP)`
        ];

        await db.runAsync(queries[0], [goals.dailyLiterTarget.toString()]);
        await db.runAsync(queries[1], [goals.monthlyEarningsTarget.toString()]);
        await db.runAsync(queries[2], [goals.dailyCollectionCountTarget.toString()]);
    },

    // Helper calculate progress
    calculateProgress(current: number, target: number): number {
        if (target <= 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    }
};
