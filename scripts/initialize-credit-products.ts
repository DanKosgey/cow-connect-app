import { supabase } from '../src/integrations/supabase/client';

async function initializeCreditProducts() {
  console.log('Initializing credit-eligible products...');
  
  // Sample products to insert
  const sampleProducts = [
    {
      name: 'Hybrid Maize Seeds',
      description: 'High-yield hybrid maize seeds suitable for various soil conditions',
      category: 'Seeds',
      unit: 'kg',
      current_stock: 100,
      reorder_level: 20,
      supplier: 'AgroTech Ltd',
      cost_price: 200,
      selling_price: 250,
      is_credit_eligible: true
    },
    {
      name: 'NPK Fertilizer',
      description: 'Balanced NPK fertilizer for crops with slow-release nutrients',
      category: 'Fertilizers',
      unit: 'bags',
      current_stock: 50,
      reorder_level: 10,
      supplier: 'FarmCare Supplies',
      cost_price: 800,
      selling_price: 1000,
      is_credit_eligible: true
    },
    {
      name: 'Herbicide Solution',
      description: 'Broad-spectrum herbicide for weed control in maize fields',
      category: 'Herbicides',
      unit: 'liters',
      current_stock: 30,
      reorder_level: 5,
      supplier: 'CropGuard Chemicals',
      cost_price: 1200,
      selling_price: 1500,
      is_credit_eligible: false
    },
    {
      name: 'Cattle Feed',
      description: 'Premium quality cattle feed for dairy cows',
      category: 'Feed',
      unit: 'bags',
      current_stock: 40,
      reorder_level: 10,
      supplier: 'DairyNutrition Co.',
      cost_price: 1500,
      selling_price: 1800,
      is_credit_eligible: true
    }
  ];

  try {
    // Insert sample products
    const { data, error } = await supabase
      .from('agrovet_inventory')
      .insert(sampleProducts)
      .select();

    if (error) {
      console.error('Error inserting sample products:', error);
      return;
    }

    console.log('Successfully inserted sample products:', data);
    
    // Verify that we can fetch credit-eligible products
    const { data: creditEligibleProducts, error: fetchError } = await supabase
      .from('agrovet_inventory')
      .select('*')
      .eq('is_credit_eligible', true);

    if (fetchError) {
      console.error('Error fetching credit-eligible products:', fetchError);
      return;
    }

    console.log('Credit-eligible products count:', creditEligibleProducts?.length || 0);
    console.log('Credit-eligible products:', creditEligibleProducts);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
initializeCreditProducts().then(() => {
  console.log('Script completed');
}).catch((error) => {
  console.error('Script failed:', error);
});