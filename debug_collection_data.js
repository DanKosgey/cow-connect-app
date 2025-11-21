// Debug script to check collection data structure
// Run this in the browser console after loading the milk approval page

(function() {
  console.log('=== Debugging Collection Data Structure ===');
  
  // Wait for the page to load
  setTimeout(() => {
    try {
      // Try to access the React component state to see the actual collection data
      const reactRoot = document.querySelector('#root');
      
      // Look for collection data in the page
      const collectionRows = document.querySelectorAll('table tbody tr');
      
      console.log(`Found ${collectionRows.length} collection rows`);
      
      collectionRows.forEach((row, index) => {
        const collectorCell = row.querySelector('td:first-child');
        const dateCell = row.querySelector('td:nth-child(2)');
        const countCell = row.querySelector('td:nth-child(3)');
        
        if (collectorCell && dateCell && countCell) {
          const collectorName = collectorCell.textContent.trim();
          const date = dateCell.textContent.trim();
          const count = countCell.textContent.trim();
          
          console.log(`Row ${index + 1}:`);
          console.log(`  Collector: ${collectorName}`);
          console.log(`  Date: ${date}`);
          console.log(`  Collections: ${count}`);
          
          // Check if collector name looks correct
          if (collectorName === 'Unassigned Collector' || collectorName === 'Unknown Collector') {
            console.warn(`  ⚠️  Warning: Collector name may be incorrect`);
          }
        }
      });
      
      // Also check for any React component data if accessible
      console.log('Checking for React component data...');
      
      // Try to find the grouped collections data
      console.log('To see the actual data structure, check the React DevTools or add console.log statements in the MilkApprovalPage component.');
      
      console.log('=== End Debug ===');
      
    } catch (error) {
      console.error('Error during debug:', error);
    }
  }, 3000); // Wait 3 seconds for page to load
})();