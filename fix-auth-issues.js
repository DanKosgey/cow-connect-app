/**
 * Comprehensive fix script for authentication issues
 * This script cleans up corrupted authentication state and resets the app
 */

async function fixAuthIssues() {
  console.log('=== Starting Authentication Fix Process ===');
  
  try {
    // Step 1: Clear all storage
    console.log('Step 1: Clearing all storage...');
    localStorage.clear();
    sessionStorage.clear();
    
    // Step 2: Clear cookies
    console.log('Step 2: Clearing cookies...');
    document.cookie.split(";").forEach(c => { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Step 3: Unregister service workers
    console.log('Step 3: Unregistering service workers...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Unregistered service worker:', registration.scope);
      }
    }
    
    // Step 4: Clear all caches
    console.log('Step 4: Clearing caches...');
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('Deleted cache:', cacheName);
      }
    }
    
    // Step 5: Clear IndexedDB
    console.log('Step 5: Clearing IndexedDB...');
    if ('indexedDB' in window) {
      const dbs = await indexedDB.databases();
      for (let db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log('Deleted IndexedDB:', db.name);
        }
      }
    }
    
    // Step 6: Reload the page
    console.log('Step 6: Reloading page...');
    console.log('=== Authentication Fix Completed Successfully ===');
    console.log('The page will reload in 3 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('Error during authentication fix:', error);
    console.log('=== Authentication Fix Failed ===');
    console.log('Please manually clear browser data and restart the application.');
  }
}

// Also provide a lighter version that just clears auth data
async function clearAuthDataOnly() {
  console.log('=== Clearing Authentication Data Only ===');
  
  try {
    // Clear auth-related localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase') || key.includes('session') || 
                  key.includes('cached') || key.includes('role'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed localStorage item:', key);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('Cleared sessionStorage');
    
    // Clear auth-related cookies
    document.cookie.split(";").forEach(c => { 
      const cookieName = c.split("=")[0].trim();
      if (cookieName.includes('auth') || cookieName.includes('supabase') || cookieName.includes('session')) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        console.log('Removed cookie:', cookieName);
      }
    });
    
    console.log('=== Authentication Data Cleared Successfully ===');
    console.log('You may need to refresh the page for changes to take effect.');
    
  } catch (error) {
    console.error('Error clearing auth data:', error);
    console.log('=== Authentication Data Clear Failed ===');
  }
}

// Export functions for use in console
window.fixAuthIssues = fixAuthIssues;
window.clearAuthDataOnly = clearAuthDataOnly;

console.log('Authentication fix scripts loaded.');
console.log('To fix authentication issues, run: await fixAuthIssues()');
console.log('To clear only auth data, run: await clearAuthDataOnly()');

// Auto-run clearAuthDataOnly if the page is stuck
// Uncomment the next line to auto-run on page load
// clearAuthDataOnly();