# Product Packaging System

## Overview

This document describes the new product packaging system that replaces the old tiered pricing system. Instead of defining price tiers based on quantity ranges, the new system allows defining discrete packaging options for each product.

## Key Changes

### 1. Database Schema Changes

A new table `product_packaging` has been added with the following structure:

```sql
CREATE TABLE product_packaging (
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
```

### 2. Data Model Changes

#### New Interface: ProductPackaging

```typescript
export interface ProductPackaging {
  id: string;
  product_id: string;
  name: string; // e.g., "100kg bag", "20kg bag"
  weight: number; // e.g., 100, 20
  unit: string; // e.g., "kg"
  price: number; // price for this package
  is_credit_eligible: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3. UI Changes

#### Product Dialog Updates

The product creation/editing dialog has been updated to use the new packaging system:

1. **Removed**: Tiered pricing section with min/max quantities
2. **Added**: Packaging options section where users can define:
   - Package name (e.g., "20kg Bag")
   - Weight/Quantity (e.g., 20)
   - Unit (e.g., "kg")
   - Price (e.g., 2200)
   - Credit eligibility per package

#### Example Packaging Options

For a animal feed product, you might define:
- 100kg bag at Ksh 10,000
- 20kg bag at Ksh 2,200
- 5kg packet at Ksh 600

### 4. Service Layer Changes

New methods have been added to the AgrovetInventoryService:

- `getProductPackaging(productId: string)`: Fetch all packaging options for a product
- `createProductPackaging(packaging: Omit<ProductPackaging, 'id' | 'created_at' | 'updated_at'>)`: Create a new packaging option
- `updateProductPackaging(id: string, packaging: Partial<Omit<ProductPackaging, 'id' | 'created_at'>>)`: Update a packaging option
- `deleteProductPackaging(id: string)`: Delete a packaging option

Deprecated methods (kept for backward compatibility):
- `getProductPricing`
- `createProductPricing`
- `updateProductPricing`
- `deleteProductPricing`

### 5. Frontend Implementation

#### Component Updates

1. **ProductDialogs.tsx**: Updated to use packaging options instead of tiered pricing
2. **ProductManagement.tsx**: Updated to manage packaging data state and save to backend
3. **productValidation.ts**: Updated validation rules for packaging options

#### State Management

The product management page now manages packaging data separately from the main product form:

```typescript
const [packagingData, setPackagingData] = useState<Partial<ProductPackaging>[]>([
  { name: '', weight: 0, unit: '', price: 0, is_credit_eligible: true }
]);
```

### 6. Migration Notes

#### Database Migration

Run the migration script to create the new table:

```sql
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
```

#### Data Migration

To migrate existing tiered pricing data to the new packaging system:

1. Export existing product pricing data
2. Transform tiered pricing data to packaging options
3. Import into the new product_packaging table

### 7. Future Enhancements

Planned improvements for the packaging system:

1. **Bulk Packaging Operations**: Allow creating multiple similar packages at once
2. **Package Templates**: Predefined packaging templates for common products
3. **Inventory Tracking per Package**: Track stock levels for each packaging option
4. **Customer-Facing Package Selection**: Enhanced UI for customers to choose packages