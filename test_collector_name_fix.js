// Test script to verify collector name fix
// Run this in the browser console after loading the milk approval page

(function() {
  console.log('=== Testing Collector Name Fix ===');
  
  // Wait for the page to load
  setTimeout(() => {
    try {
      // Find the collector name elements in the table
      const collectorNameElements = document.querySelectorAll('table tbody tr td:first-child');
      
      if (collectorNameElements.length === 0) {
        console.log('⚠️  No collector name elements found. Page may still be loading.');
        return;
      }
      
      console.log(`Found ${collectorNameElements.length} collector entries:`);
      
      let allNamesValid = true;
      
      collectorNameElements.forEach((element, index) => {
        const collectorName = element.textContent.trim();
        console.log(`  ${index + 1}. "${collectorName}"`);
        
        // Check for obviously incorrect names
        if (collectorName === 'Unknown Collector') {
          console.warn(`  ⚠️  Warning: Found "Unknown Collector" at position ${index + 1}`);
          allNamesValid = false;
        }
        
        // Check if the name looks like a real name (has spaces, not just IDs)
        if (collectorName.includes('-') && collectorName.length > 20 && !collectorName.includes(' ')) {
          console.warn(`  ⚠️  Warning: Collector name looks like an ID: "${collectorName}"`);
          allNamesValid = false;
        }
      });
      
      if (allNamesValid) {
        console.log('✅ All collector names appear to be valid');
      } else {
        console.log('❌ Some collector names may be incorrect. Check the warnings above.');
      }
      
      // Also check for the unassigned badge
      const unassignedBadges = document.querySelectorAll('table tbody tr td:first-child .bg-destructive');
      if (unassignedBadges.length > 0) {
        console.log(`ℹ️  Found ${unassignedBadges.length} unassigned collection groups (this is expected)`);
      }
      
      console.log('=== Test Complete ===');
      
    } catch (error) {
      console.error('Error during test:', error);
    }
  }, 2000); // Wait 2 seconds for page to load
})();