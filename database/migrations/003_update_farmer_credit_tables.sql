-- Update farmer credit tables to work with the new packaging system

-- Add necessary columns to agrovet_purchases table if they don't exist
ALTER TABLE agrovet_purchases 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS packaging_id UUID REFERENCES product_packaging(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_packaging_id ON agrovet_purchases(packaging_id);

-- Update existing records to have unit_price from agrovet_inventory if not set
UPDATE agrovet_purchases 
SET unit_price = ai.selling_price 
FROM agrovet_inventory ai 
WHERE agrovet_purchases.item_id = ai.id 
AND agrovet_purchases.unit_price = 0;

-- Add a comment to document the table structure
COMMENT ON TABLE agrovet_purchases IS 'Tracks all agrovet purchases by farmers, including those made with credit. Updated to support packaging options.';