
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestRequest() {
    console.log('Checking latest credit request...');
    const { data: requests, error } = await supabase
        .from('credit_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching requests:', error);
        return;
    }

    if (requests && requests.length > 0) {
        const req = requests[0];
        console.log('Latest Request:', req);

        // Check for purchase
        const { data: purchase, error: pError } = await supabase
            .from('agrovet_purchases')
            .select('*')
            .eq('created_at', req.created_at) // Approximate link, or just check latest purchase
            .limit(1);

        // Better: check purchase by farmer and time
        const { data: latestPurchase } = await supabase
            .from('agrovet_purchases')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        console.log('Latest Purchase:', latestPurchase?.[0]);

    } else {
        console.log('No credit requests found.');
    }
}

checkLatestRequest();
