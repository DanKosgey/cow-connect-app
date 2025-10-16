-- Migration: 20251015000900_create_inventory_functions.sql
-- Description: Create functions for inventory management

BEGIN;

-- Create function to update inventory stock levels
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the current_stock in inventory_items based on transaction type
    IF TG_OP = 'INSERT' THEN
        IF NEW.transaction_type = 'in' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock + NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.item_id;
        ELSIF NEW.transaction_type = 'out' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock - NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.item_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle updates by reverting the old transaction and applying the new one
        IF OLD.transaction_type = 'in' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock - OLD.quantity
            WHERE id = OLD.item_id;
        ELSIF OLD.transaction_type = 'out' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock + OLD.quantity
            WHERE id = OLD.item_id;
        END IF;
        
        IF NEW.transaction_type = 'in' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock + NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.item_id;
        ELSIF NEW.transaction_type = 'out' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock - NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.item_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.transaction_type = 'in' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock - OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.item_id;
        ELSIF OLD.transaction_type = 'out' THEN
            UPDATE inventory_items 
            SET current_stock = current_stock + OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.item_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock levels
DROP TRIGGER IF EXISTS update_inventory_stock_trigger ON inventory_transactions;
CREATE TRIGGER update_inventory_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_stock();

COMMIT;