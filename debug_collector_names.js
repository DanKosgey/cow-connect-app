// Debug script to check collector names - run in browser console
// Copy and paste this into your browser's developer console

console.log('=== Debugging Collector Names ===');

// Function to check collector names in grouped collections
function debugCollectorNames() {
  // Get all the collection groups from the page
  const collectionGroups = document.querySelectorAll('table tbody tr');
  
  console.log(`Found ${collectionGroups.length} collection groups:`);
  
  collectionGroups.forEach((row, index) => {
    const collectorCell = row.querySelector('td:first-child');
    const dateCell = row.querySelector('td:nth-child(2)');
    const countCell = row.querySelector('td:nth-child(3)');
    
    if (collectorCell && dateCell && countCell) {
      const collectorName = collectorCell.textContent.trim();
      const date = dateCell.textContent.trim();
      const count = countCell.textContent.trim();
      
      console.log(`Group ${index + 1}:`);
      console.log(`  Collector: ${collectorName}`);
      console.log(`  Date: ${date}`);
      console.log(`  Collections: ${count}`);
      
      // Check if collector name looks correct
      if (collectorName === 'Unassigned Collector' || collectorName === 'Unknown Collector') {
        console.warn(`  ⚠️  Warning: Collector name may be incorrect`);
      }
    }
  });
}

// Run the debug function
debugCollectorNames();

console.log('=== End Debug ===');