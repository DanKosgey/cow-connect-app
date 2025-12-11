/**
 * Debug script for authentication issues
 * Run this in the browser console to diagnose auth problems
 */

(function debugAuthIssues() {
  console.log('=== Authentication Debug Information ===');
  
  // Check localStorage for auth-related items
  console.log('\n--- LocalStorage Items ---');
  const authItems = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth') || key.includes('supabase') || key.includes('session'))) {
      try {
        authItems[key] = localStorage.getItem(key);
        console.log(`${key}:`, authItems[key]);
      } catch (e) {
        console.log(`${key}: [Error reading item]`);
      }
    }
  }
  
  // Check sessionStorage for auth-related items
  console.log('\n--- SessionStorage Items ---');
  const sessionItems = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('auth') || key.includes('supabase') || key.includes('session'))) {
      try {
        sessionItems[key] = sessionStorage.getItem(key);
        console.log(`${key}:`, sessionItems[key]);
      } catch (e) {
        console.log(`${key}: [Error reading item]`);
      }
    }
  }
  
  // Check cookies
  console.log('\n--- Cookies ---');
  console.log(document.cookie);
  
  // Check for service worker
  console.log('\n--- Service Worker Status ---');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('Service workers:', registrations.length);
      registrations.forEach(reg => {
        console.log('Registration:', reg.scope);
      });
    });
  } else {
    console.log('Service workers not supported');
  }
  
  // Check for indexedDB databases
  console.log('\n--- IndexedDB Databases ---');
  if ('indexedDB' in window) {
    indexedDB.databases().then(dbs => {
      console.log('IndexedDB databases:', dbs);
    }).catch(e => {
      console.log('Error listing IndexedDB databases:', e);
    });
  } else {
    console.log('IndexedDB not supported');
  }
  
  // Check navigator credentials
  console.log('\n--- Navigator Credentials ---');
  if ('credentials' in navigator) {
    console.log('Credentials API available');
  } else {
    console.log('Credentials API not available');
  }
  
  console.log('\n=== End Debug Information ===');
  
  // Provide cleanup instructions
  console.log('\n=== Cleanup Instructions ===');
  console.log('To manually clear authentication data:');
  console.log('1. Run: localStorage.clear()');
  console.log('2. Run: sessionStorage.clear()');
  console.log('3. Run: document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); })');
  console.log('4. Refresh the page');
  
  return {
    localStorage: authItems,
    sessionStorage: sessionItems,
    cookies: document.cookie
  };
})();

// Export for use in console
window.debugAuthIssues = debugAuthIssues;