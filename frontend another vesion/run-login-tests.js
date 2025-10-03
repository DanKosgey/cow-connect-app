// Test runner script for DairyChain Pro login tests
console.log('DairyChain Pro - Portal Login Test Runner');
console.log('==========================================');

// Check if Node.js is available
if (typeof process === 'undefined') {
  console.log('This script needs to be run with Node.js');
  console.log('Please run: node test-login-comprehensive.js');
  return;
}

// Import and run the comprehensive tests
const { runAllTests } = require('./test-login-comprehensive.js');

console.log('Starting login tests...\n');

runAllTests()
  .then(success => {
    console.log(`\n🎯 Overall Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error during testing:', error);
    process.exit(1);
  });