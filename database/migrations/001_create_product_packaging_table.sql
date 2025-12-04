-- Create product_packaging table
CREATE TABLE IF NOT EXISTS product_packaging (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES agrovet_inventory(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_credit_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_packaging_product_id ON product_packaging(product_id);
CREATE INDEX IF NOT EXISTS idx_product_packaging_name ON product_packaging(name);

-- Enable RLS (Row Level Security)
ALTER TABLE product_packaging ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be added in a separate migration file
-- For now, no grants are needed as policies will control access