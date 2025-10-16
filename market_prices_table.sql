-- Create the market_prices table
CREATE TABLE IF NOT EXISTS public.market_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    previous_price DECIMAL(10, 2) DEFAULT 0,
    change DECIMAL(10, 2) DEFAULT 0,
    change_percent DECIMAL(5, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_market_prices_product ON public.market_prices (product);
CREATE INDEX IF NOT EXISTS idx_market_prices_region ON public.market_prices (region);
CREATE INDEX IF NOT EXISTS idx_market_prices_updated_at ON public.market_prices (updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for all users
CREATE POLICY "Allow read access for market prices" ON public.market_prices
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.market_prices TO anon;
GRANT SELECT ON public.market_prices TO authenticated;
GRANT ALL ON public.market_prices TO service_role;

-- Insert some sample data
INSERT INTO public.market_prices (product, region, price, previous_price, change, change_percent) VALUES
    ('Fresh Milk', 'Nairobi', 65.50, 63.20, 2.30, 3.64),
    ('Fresh Milk', 'Kisumu', 62.00, 61.50, 0.50, 0.81),
    ('Fresh Milk', 'Nakuru', 64.20, 63.80, 0.40, 0.63),
    ('Fresh Milk', 'Mombasa', 68.00, 67.50, 0.50, 0.74),
    ('Fresh Milk', 'Eldoret', 61.80, 61.20, 0.60, 0.98),
    ('Pasteurized Milk', 'Nairobi', 75.00, 74.50, 0.50, 0.67),
    ('Pasteurized Milk', 'Kisumu', 72.50, 72.00, 0.50, 0.69),
    ('Pasteurized Milk', 'Nakuru', 74.20, 73.80, 0.40, 0.54),
    ('Pasteurized Milk', 'Mombasa', 77.50, 77.00, 0.50, 0.65),
    ('Pasteurized Milk', 'Eldoret', 71.80, 71.50, 0.30, 0.42),
    ('Butter', 'Nairobi', 320.00, 315.00, 5.00, 1.59),
    ('Butter', 'Kisumu', 315.50, 312.00, 3.50, 1.12),
    ('Butter', 'Nakuru', 318.20, 316.80, 1.40, 0.44),
    ('Butter', 'Mombasa', 325.00, 322.50, 2.50, 0.77),
    ('Butter', 'Eldoret', 312.80, 311.20, 1.60, 0.51),
    ('Cheese', 'Nairobi', 450.00, 445.00, 5.00, 1.12),
    ('Cheese', 'Kisumu', 445.50, 442.00, 3.50, 0.79),
    ('Cheese', 'Nakuru', 448.20, 446.80, 1.40, 0.31),
    ('Cheese', 'Mombasa', 455.00, 452.50, 2.50, 0.55),
    ('Cheese', 'Eldoret', 442.80, 441.20, 1.60, 0.36);