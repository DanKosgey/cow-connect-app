-- Migration: 20251015001000_seed_inventory_data.sql
-- Description: Seed initial inventory data

BEGIN;

-- Insert sample inventory items
INSERT INTO public.inventory_items (id, name, description, category, unit, current_stock, reorder_level, supplier, cost_per_unit) VALUES
('00000000-0000-0000-0000-000000000001', 'Dairy Feed Mix', 'High-quality feed mix for dairy cows', 'Feed', 'kg', 500.00, 100.00, 'AgriSupplies Ltd', 12.50),
('00000000-0000-0000-0000-000000000002', 'Hay Bales', 'Premium quality hay for cattle', 'Feed', 'bale', 25.00, 10.00, 'Green Pastures Farm', 8.75),
('00000000-0000-0000-0000-000000000003', 'Mineral Supplements', 'Essential minerals for dairy cattle', 'Feed', 'kg', 50.00, 20.00, 'VetSupply Co', 25.00),
('00000000-0000-0000-0000-000000000004', 'Antibiotic Injection', 'Broad spectrum antibiotic for cattle', 'Medicine', 'ml', 1000.00, 200.00, 'Veterinary Solutions', 3.25),
('00000000-0000-0000-0000-000000000005', 'Milking Machine Parts', 'Replacement parts for milking equipment', 'Equipment', 'piece', 15.00, 5.00, 'DairyTech Equipment', 150.00),
('00000000-0000-0000-0000-000000000006', 'Cleaning Disinfectant', 'Heavy-duty disinfectant for dairy equipment', 'Cleaning Supplies', 'liter', 20.00, 5.00, 'Sanitation Pro', 18.50),
('00000000-0000-0000-0000-000000000007', 'Milk Storage Containers', 'Food-grade containers for milk storage', 'Packaging', 'piece', 50.00, 10.00, 'Packaging Solutions', 22.00),
('00000000-0000-0000-0000-000000000008', 'Teat Dip Solution', 'Antiseptic solution for teat dipping', 'Medicine', 'liter', 30.00, 10.00, 'UdderCare Products', 15.75)
ON CONFLICT (id) DO NOTHING;

COMMIT;