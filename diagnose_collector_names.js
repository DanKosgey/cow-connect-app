// Diagnostic script to check collector name issues in milk approval system
// Run this in the browser console after loading the milk approval page

(function() {
  console.log('=== Diagnosing Collector Name Issues ===');
  
  // Wait for the page to load
  setTimeout(async () => {
    try {
      console.log('1. Checking for "Unknown Collector" entries...');
      
      // Look for the "Unknown Collector" elements in the UI
      const unknownCollectorElements = Array.from(document.querySelectorAll('td'))
        .filter(td => td.textContent.trim() === 'Unknown Collector');
        
      if (unknownCollectorElements.length > 0) {
        console.log(`❌ Found ${unknownCollectorElements.length} "Unknown Collector" entries in UI`);
      } else {
        console.log('✅ No "Unknown Collector" entries found in UI');
      }
      
      console.log('2. Checking React component state...');
      
      // Try to access the React component state to see the actual collection data
      // This requires React DevTools, but we can try to find the data in the DOM
      const collectionRows = document.querySelectorAll('table tbody tr');
      console.log(`Found ${collectionRows.length} collection rows in UI`);
      
      // Check if we can access the grouped collections data
      console.log('3. Checking grouped collections data structure...');
      
      // Try to find the grouped collections in the page
      const groupedRows = document.querySelectorAll('table tbody tr');
      groupedRows.forEach((row, index) => {
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
          if (collectorName === 'Unknown Collector' || collectorName === 'Unassigned Collector') {
            console.warn(`  ⚠️  Warning: Collector name may be incorrect`);
          }
        }
      });
      
      console.log('4. Checking individual collections...');
      
      // Look for individual collection details
      const individualRows = document.querySelectorAll('table tbody tr');
      individualRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const collectorCell = cells[3]; // Collector column
          if (collectorCell) {
            const collectorName = collectorCell.textContent.trim();
            if (collectorName.includes('Unknown') || collectorName.includes('Unassigned')) {
              console.warn(`  ⚠️  Individual collection ${index + 1} has collector issue: ${collectorName}`);
            }
          }
        }
      });
      
      console.log('5. Suggested fixes:');
      console.log('   - Refresh the page to see if the issue persists');
      console.log('   - Check browser console for any errors during data loading');
      console.log('   - Verify that staff profiles are properly set up in the database');
      console.log('   - Ensure RLS policies allow access to staff profile data');
      
      console.log('=== Diagnosis Complete ===');
      
    } catch (error) {
      console.error('Error during diagnosis:', error);
    }
  }, 3000); // Wait 3 seconds for page to load
})();