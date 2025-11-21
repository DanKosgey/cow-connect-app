// Test script to verify staff profile fix
// Run this in the browser console after loading the milk approval page

(async function() {
  console.log('=== Testing Staff Profile Fix ===');
  
  // Wait for the page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Check if there are any collections with "Unknown Collector"
    const unknownCollectorRows = Array.from(document.querySelectorAll('table tbody tr'))
      .filter(row => {
        const collectorCell = row.querySelector('td:first-child');
        return collectorCell && collectorCell.textContent.trim() === 'Unknown Collector';
      });
    
    if (unknownCollectorRows.length > 0) {
      console.log(`⚠️  Found ${unknownCollectorRows.length} rows with "Unknown Collector"`);
      
      // Try to trigger a refresh to see if the fix works
      const refreshButton = document.querySelector('button[aria-label="Refresh"]');
      if (refreshButton) {
        console.log('Refreshing data...');
        refreshButton.click();
        
        // Wait a bit and check again
        setTimeout(() => {
          const stillUnknown = Array.from(document.querySelectorAll('table tbody tr'))
            .filter(row => {
              const collectorCell = row.querySelector('td:first-child');
              return collectorCell && collectorCell.textContent.trim() === 'Unknown Collector';
            });
            
          if (stillUnknown.length === 0) {
            console.log('✅ Fixed! No more "Unknown Collector" entries after refresh');
          } else {
            console.log(`❌ Still ${stillUnknown.length} "Unknown Collector" entries after refresh`);
          }
        }, 2000);
      }
    } else {
      console.log('✅ No "Unknown Collector" entries found');
    }
    
    // Also check the actual data in the React component state if possible
    const reactRoot = document.querySelector('#root');
    if (reactRoot) {
      // This is a more advanced check that might not work in all browsers
      console.log('Page loaded successfully, check browser console for detailed logs');
    }
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
})();