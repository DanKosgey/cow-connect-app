-- Migration: 20251015000800_create_inventory_tables.sql
-- Description: Create inventory management tables for tracking dairy farm supplies

BEGIN;

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    cost_per_unit DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('in', 'out')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON public.inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);

-- Add RLS policies
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_items
CREATE POLICY "Staff can view inventory items" ON public.inventory_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert inventory items" ON public.inventory_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update inventory items" ON public.inventory_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete inventory items" ON public.inventory_items
    FOR DELETE TO authenticated USING (true);

-- RLS policies for inventory_transactions
CREATE POLICY "Staff can view inventory transactions" ON public.inventory_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert inventory transactions" ON public.inventory_transactions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update inventory transactions" ON public.inventory_transactions
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete inventory transactions" ON public.inventory_transactions
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_transactions TO authenticated;

COMMIT;