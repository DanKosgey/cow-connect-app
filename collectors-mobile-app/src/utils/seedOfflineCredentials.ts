/**
 * DEMO ONLY: Seeds offline credentials for testing
 * This allows you to test offline mode without needing to login online first
 * 
 * SECURITY WARNING: Remove this file in production!
 */

import { getDatabase } from '../services/database';
import { hashPassword } from '../services/crypto.utils';

export const seedDemoCredentials = async () => {
    const db = await getDatabase();

    try {
        // Check if already seeded
        const existing = await db.getFirstAsync(
            'SELECT * FROM auth_cache WHERE email = ?',
            ['demo@collector.com']
        );

        if (existing) {
            console.log('Demo credentials already seeded');
            return;
        }

        // Seed demo collector account
        const demoPassword = 'demo123'; // Change this to match your test account
        const passwordHash = await hashPassword(demoPassword);

        await db.runAsync(
            `INSERT INTO auth_cache 
             (user_id, email, password_hash, role, staff_id, full_name, phone, last_login, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                'demo-user-id-123',
                'demo@collector.com',
                passwordHash,
                'collector',
                'demo-staff-id-456',
                'Demo Collector',
                '+254700000000',
            ]
        );

        console.log('✅ Demo credentials seeded successfully!');
        console.log('📧 Email: demo@collector.com');
        console.log('🔑 Password: demo123');

    } catch (error) {
        console.error('Failed to seed demo credentials:', error);
    }
};
