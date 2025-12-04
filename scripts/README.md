# Migration Scripts

This directory contains scripts to help migrate data from the old tiered pricing system to the new packaging system.

## migrate-tiered-pricing-to-packaging.js

This script migrates existing product pricing data from the `product_pricing` table to the new `product_packaging` table.

### Prerequisites

1. Node.js installed
2. Supabase credentials configured in environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

### Usage

1. Make sure you have the required environment variables set:
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_KEY="your-supabase-service-key"
   ```

2. Run the script:
   ```bash
   node migrate-tiered-pricing-to-packaging.js
   ```

### What the Script Does

1. Fetches all existing product pricing records
2. Fetches product information to get product names and units
3. Converts each pricing tier to a packaging option:
   - Uses existing packaging information if available
   - Otherwise creates descriptive names based on quantity ranges
   - Calculates appropriate weights for each package
4. Inserts new records into the `product_packaging` table
5. Reports on migration progress and any errors

### Notes

- The script preserves the original `created_at` and `updated_at` timestamps
- Failed migrations are logged but don't stop the overall process
- The script can be run multiple times safely (duplicate records will cause errors, but existing records won't be duplicated)
- Review the conversion logic in the script to ensure it matches your business requirements

### Customization

You may need to customize the script based on your specific data structure:
- Adjust the package name generation logic
- Modify how weights are calculated
- Change how units are determined
- Add additional fields to the packaging records

Always test the script on a copy of your data before running it on production data.