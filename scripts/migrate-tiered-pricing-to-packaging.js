#!/usr/bin/env node

/**
 * Script to migrate tiered pricing data to the new packaging system
 * 
 * This script converts existing product_pricing records to product_packaging records.
 * It assumes a simple conversion where each pricing tier becomes a packaging option.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTieredPricingToPackaging() {
  try {
    console.log('Starting migration from tiered pricing to packaging system...');
    
    // Fetch all existing product pricing data
    const { data: pricingData, error: fetchError } = await supabase
      .from('product_pricing')
      .select('*')
      .order('product_id', { ascending: true })
      .order('min_quantity', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch product pricing data: ${fetchError.message}`);
    }

    console.log(`Found ${pricingData.length} pricing records to migrate`);

    // Fetch product data to get product names and units
    const { data: products, error: productError } = await supabase
      .from('agrovet_inventory')
      .select('id, name, unit');

    if (productError) {
      throw new Error(`Failed to fetch product data: ${productError.message}`);
    }

    // Create a map of product ID to product data for easy lookup
    const productMap = {};
    products.forEach(product => {
      productMap[product.id] = product;
    });

    let migratedCount = 0;
    
    // Process each pricing record
    for (const pricing of pricingData) {
      try {
        const product = productMap[pricing.product_id];
        
        if (!product) {
          console.warn(`Skipping pricing record ${pricing.id}: Product not found`);
          continue;
        }
        
        // Convert tiered pricing to packaging option
        // This is a simplified conversion - you may need to adjust based on your specific data
        let packageName = '';
        let packageWeight = 0;
        
        // If we have packaging size info, use it
        if (pricing.packaging_size && pricing.packaging_unit) {
          packageName = `${pricing.packaging_size}${pricing.packaging_unit} ${product.name}`;
          packageWeight = pricing.packaging_size;
        } 
        // Otherwise, create a descriptive name based on quantity range
        else if (pricing.min_quantity === 1 && pricing.max_quantity === null) {
          // Single tier covering all quantities - use unit from product
          packageName = `${product.unit} of ${product.name}`;
          packageWeight = 1;
        } else if (pricing.max_quantity === null) {
          // Open ended tier
          packageName = `${pricing.min_quantity}+ ${product.unit} of ${product.name}`;
          packageWeight = pricing.min_quantity;
        } else if (pricing.min_quantity === pricing.max_quantity) {
          // Single quantity tier
          packageName = `${pricing.min_quantity} ${product.unit} of ${product.name}`;
          packageWeight = pricing.min_quantity;
        } else {
          // Range tier
          packageName = `${pricing.min_quantity}-${pricing.max_quantity} ${product.unit} of ${product.name}`;
          // Use average for weight
          packageWeight = (pricing.min_quantity + (pricing.max_quantity || pricing.min_quantity)) / 2;
        }
        
        // Create packaging record
        const { error: insertError } = await supabase
          .from('product_packaging')
          .insert({
            product_id: pricing.product_id,
            name: packageName,
            weight: packageWeight,
            unit: pricing.packaging_unit || product.unit || 'unit',
            price: pricing.price_per_unit,
            is_credit_eligible: pricing.is_credit_eligible,
            created_at: pricing.created_at,
            updated_at: pricing.updated_at
          });

        if (insertError) {
          console.error(`Failed to migrate pricing record ${pricing.id}: ${insertError.message}`);
          continue;
        }

        migratedCount++;
        console.log(`Migrated pricing record ${pricing.id} to packaging: ${packageName}`);
        
        // Optional: Add a small delay to avoid rate limiting
        // await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (recordError) {
        console.error(`Error processing pricing record ${pricing.id}:`, recordError.message);
      }
    }
    
    console.log(`Migration completed. Successfully migrated ${migratedCount} of ${pricingData.length} records.`);
    
    // Optional: Report any records that failed to migrate
    if (migratedCount < pricingData.length) {
      console.warn(`${pricingData.length - migratedCount} records failed to migrate.`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateTieredPricingToPackaging()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateTieredPricingToPackaging };