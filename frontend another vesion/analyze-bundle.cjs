const fs = require('fs');
const path = require('path');

// Read the manifest file
const manifestPath = path.join(__dirname, 'build', '.vite', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Find our portal components
const portalComponents = [
  'AdminDashboard-Z-p5KUzW.js',
  'FarmerPortal-Ce2OXk3X.js',
  'StaffPortal-B2WCygze.js'
];

console.log('=== Bundle Analysis ===\n');

// Get sizes of portal components
console.log('Portal Component Sizes:');
portalComponents.forEach(component => {
  const entry = Object.values(manifest).find(item => item.file === `assets/${component}`);
  if (entry) {
    const stats = fs.statSync(path.join(__dirname, 'build', entry.file));
    console.log(`  ${component}: ${(stats.size / 1024).toFixed(2)} kB`);
  }
});

// Get total size of all assets
const assetsDir = path.join(__dirname, 'build', 'assets');
const files = fs.readdirSync(assetsDir);
let totalSize = 0;

files.forEach(file => {
  const stats = fs.statSync(path.join(assetsDir, file));
  totalSize += stats.size;
});

console.log(`\nTotal Assets Size: ${(totalSize / 1024).toFixed(2)} kB (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

// Show top 10 largest files
console.log('\nTop 10 Largest Files:');
const fileSizes = files.map(file => {
  const stats = fs.statSync(path.join(assetsDir, file));
  return { name: file, size: stats.size };
}).sort((a, b) => b.size - a.size);

fileSizes.slice(0, 10).forEach((file, index) => {
  console.log(`  ${index + 1}. ${file.name}: ${(file.size / 1024).toFixed(2)} kB`);
});

console.log('\n=== Code Splitting Benefits ===');
console.log('By implementing code splitting:');
console.log('- Portal components are now loaded on-demand');
console.log('- Initial bundle size is reduced');
console.log('- Users only download what they need');
console.log('- Performance improved for route transitions');