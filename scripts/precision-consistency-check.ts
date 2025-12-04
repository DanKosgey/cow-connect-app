import { supabase } from '../src/integrations/supabase/client';
import { AgrovetInventoryService } from '../src/services/agrovet-inventory-service';
import { CreditServiceEssentials } from '../src/services/credit-service-essentials';

async function runPrecisionConsistencyCheck() {
  console.log('Running precision consistency check between portals...');
  
  try {
    console.log('\n--- FETCHING DATA FROM BOTH PORTALS ---');
    
    // Get all products from creditor perspective
    const creditorProducts = await AgrovetInventoryService.getInventory();
    console.log(`Creditor portal products: ${creditorProducts.length}`);
    
    // Get credit-eligible products from farmer perspective
    const farmerProducts = await CreditServiceEssentials.getAgrovetInventory();
    console.log(`Farmer portal products (credit-eligible): ${farmerProducts.length}`);
    
    console.log('\n--- PRECISION CONSISTENCY CHECKS ---');
    
    // 1. Count consistency
    const expectedCreditEligibleCount = creditorProducts.filter(p => p.is_credit_eligible).length;
    const actualCreditEligibleCount = farmerProducts.length;
    
    console.log(`Expected credit-eligible products: ${expectedCreditEligibleCount}`);
    console.log(`Actual credit-eligible products: ${actualCreditEligibleCount}`);
    
    if (expectedCreditEligibleCount === actualCreditEligibleCount) {
      console.log('✅ COUNT CONSISTENCY: PASSED');
    } else {
      console.log('❌ COUNT CONSISTENCY: FAILED');
      console.log(`   Difference: ${Math.abs(expectedCreditEligibleCount - actualCreditEligibleCount)}`);
    }
    
    // 2. ID consistency
    const creditorProductIds = new Set(creditorProducts.map(p => p.id));
    const farmerProductIds = new Set(farmerProducts.map(p => p.id));
    
    const missingInFarmer = [...creditorProductIds].filter(id => 
      creditorProducts.find(p => p.id === id)?.is_credit_eligible && !farmerProductIds.has(id)
    );
    
    const extraInFarmer = [...farmerProductIds].filter(id => !creditorProductIds.has(id));
    
    if (missingInFarmer.length === 0 && extraInFarmer.length === 0) {
      console.log('✅ ID CONSISTENCY: PASSED');
    } else {
      console.log('❌ ID CONSISTENCY: FAILED');
      if (missingInFarmer.length > 0) {
        console.log(`   Missing in farmer view: ${missingInFarmer.length}`);
        console.log(`   IDs: ${missingInFarmer.join(', ')}`);
      }
      if (extraInFarmer.length > 0) {
        console.log(`   Extra in farmer view: ${extraInFarmer.length}`);
        console.log(`   IDs: ${extraInFarmer.join(', ')}`);
      }
    }
    
    // 3. Data field precision check
    console.log('\n--- FIELD PRECISION CHECKS ---');
    let fieldChecksPassed = 0;
    let totalFieldChecks = 0;
    
    // Create maps for easy lookup
    const creditorProductsMap = new Map(creditorProducts.map(p => [p.id, p]));
    const farmerProductsMap = new Map(farmerProducts.map(p => [p.id, p]));
    
    // Check each farmer product against creditor product
    for (const [id, farmerProduct] of farmerProductsMap) {
      const creditorProduct = creditorProductsMap.get(id);
      if (!creditorProduct) {
        console.log(`❌ Farmer product ${id} not found in creditor data`);
        continue;
      }
      
      // Fields to check for precision
      const fieldsToCheck = [
        'name', 'description', 'category', 'unit', 'supplier',
        'cost_price', 'selling_price', 'current_stock', 'reorder_level'
      ];
      
      for (const field of fieldsToCheck) {
        totalFieldChecks++;
        const farmerValue = farmerProduct[field as keyof typeof farmerProduct];
        const creditorValue = creditorProduct[field as keyof typeof creditorProduct];
        
        if (farmerValue === creditorValue) {
          fieldChecksPassed++;
        } else {
          console.log(`❌ Field precision mismatch for product ${id}, field ${field}:`);
          console.log(`   Farmer: ${farmerValue}`);
          console.log(`   Creditor: ${creditorValue}`);
        }
      }
      
      // Special check for is_credit_eligible (must be true for farmer products)
      totalFieldChecks++;
      if (creditorProduct.is_credit_eligible === true && farmerProduct.is_credit_eligible === true) {
        fieldChecksPassed++;
      } else {
        console.log(`❌ Credit eligibility mismatch for product ${id}:`);
        console.log(`   Creditor: ${creditorProduct.is_credit_eligible}`);
        console.log(`   Farmer: ${farmerProduct.is_credit_eligible}`);
      }
    }
    
    const fieldPrecisionRate = (fieldChecksPassed / totalFieldChecks) * 100;
    console.log(`✅ FIELD PRECISION: ${fieldChecksPassed}/${totalFieldChecks} checks passed (${fieldPrecisionRate.toFixed(2)}%)`);
    
    // 4. Timestamp consistency
    console.log('\n--- TIMESTAMP CONSISTENCY CHECKS ---');
    let timestampChecksPassed = 0;
    let totalTimestampChecks = 0;
    
    for (const [id, farmerProduct] of farmerProductsMap) {
      const creditorProduct = creditorProductsMap.get(id);
      if (!creditorProduct) continue;
      
      totalTimestampChecks++;
      // Check if timestamps are reasonably close (within 1 second)
      const creditorUpdated = new Date(creditorProduct.updated_at).getTime();
      const farmerUpdated = new Date(farmerProduct.updated_at).getTime();
      const timeDiff = Math.abs(creditorUpdated - farmerUpdated);
      
      if (timeDiff <= 1000) { // 1 second tolerance
        timestampChecksPassed++;
      } else {
        console.log(`⚠️  Timestamp mismatch for product ${id}:`);
        console.log(`   Difference: ${timeDiff}ms`);
      }
    }
    
    if (totalTimestampChecks > 0) {
      const timestampSuccessRate = (timestampChecksPassed / totalTimestampChecks) * 100;
      console.log(`✅ TIMESTAMP CONSISTENCY: ${timestampChecksPassed}/${totalTimestampChecks} checks passed (${timestampSuccessRate.toFixed(2)}%)`);
    }
    
    // 5. Statistical analysis
    console.log('\n--- STATISTICAL ANALYSIS ---');
    const totalProducts = creditorProducts.length;
    const creditEligibleProducts = creditorProducts.filter(p => p.is_credit_eligible);
    const creditEligiblePercentage = totalProducts > 0 ? (creditEligibleProducts.length / totalProducts) * 100 : 0;
    
    console.log(`Total products: ${totalProducts}`);
    console.log(`Credit-eligible products: ${creditEligibleProducts.length} (${creditEligiblePercentage.toFixed(2)}%)`);
    
    // Price analysis
    if (creditorProducts.length > 0) {
      const avgSellingPrice = creditorProducts.reduce((sum, p) => sum + p.selling_price, 0) / creditorProducts.length;
      const avgCostPrice = creditorProducts.reduce((sum, p) => sum + p.cost_price, 0) / creditorProducts.length;
      const avgMargin = ((avgSellingPrice - avgCostPrice) / avgCostPrice) * 100;
      
      console.log(`Average selling price: KES ${avgSellingPrice.toFixed(2)}`);
      console.log(`Average cost price: KES ${avgCostPrice.toFixed(2)}`);
      console.log(`Average margin: ${avgMargin.toFixed(2)}%`);
    }
    
    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    creditorProducts.forEach(p => {
      categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + 1;
    });
    
    console.log('\nCategory distribution:');
    Object.entries(categoryDistribution).forEach(([category, count]) => {
      const percentage = (count / totalProducts) * 100;
      console.log(`  ${category}: ${count} (${percentage.toFixed(1)}%)`);
    });
    
    // Final assessment
    console.log('\n--- FINAL ASSESSMENT ---');
    const overallChecks = [
      expectedCreditEligibleCount === actualCreditEligibleCount,
      missingInFarmer.length === 0 && extraInFarmer.length === 0,
      fieldPrecisionRate >= 95, // At least 95% field precision
      totalTimestampChecks === 0 || (timestampChecksPassed / totalTimestampChecks) >= 0.95
    ];
    
    const passedChecks = overallChecks.filter(check => check).length;
    const totalChecks = overallChecks.length;
    
    console.log(`Overall consistency checks: ${passedChecks}/${totalChecks} passed`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 ALL PRECISION CHECKS PASSED - Portals are synchronized with high precision');
    } else if (passedChecks >= totalChecks * 0.75) {
      console.log('⚠️  MOST CHECKS PASSED - Minor inconsistencies detected but system is mostly synchronized');
    } else {
      console.log('❌ SIGNIFICANT INCONSISTENCIES DETECTED - Portal synchronization requires attention');
    }

  } catch (error) {
    console.error('❌ Precision consistency check FAILED:', error);
  }
}

// Run the precision check
runPrecisionConsistencyCheck().then(() => {
  console.log('\nPrecision consistency check completed');
}).catch((error) => {
  console.error('Precision consistency check failed:', error);
});