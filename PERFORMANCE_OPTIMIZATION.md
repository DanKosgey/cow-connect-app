# Performance Optimization Guide

## Understanding Resource Preloading Warnings

### The Warning Explained
```
The resource http://localhost:5173/src/main.tsx was preloaded using link preload but not used within a few seconds from the window's load event.
```

This warning occurs when:
1. A resource is preloaded using `<link rel="preload">`
2. The browser doesn't actually use that resource within a few seconds
3. There's a mismatch between what's being preloaded and what's actually needed

### Root Cause
In Vite + React applications:
- Source files (`.tsx`, `.ts`) are compiled to JavaScript during the build process
- The actual filenames include hashes for cache busting
- Preloading source files directly is ineffective

## Proper Preloading Strategy

### Development vs Production
- **Development**: Let Vite handle resource loading automatically
- **Production**: Use Vite's build process to generate optimized assets

### Correct Preloading Practices

#### 1. Remove Source File Preloading
```html
<!-- ❌ Incorrect -->
<link rel="preload" href="/src/main.tsx" as="script" />

<!-- ✅ Correct - Remove or comment out during development -->
```

#### 2. Let Vite Handle Asset Preloading
Vite automatically handles critical resource loading during the build process.

#### 3. Preload Only Critical Production Assets
For production, preload only critical assets that you know will be used:

```html
<!-- ✅ Examples of appropriate preloading -->
<link rel="preload" href="/assets/main-[hash].js" as="script" />
<link rel="preload" href="/assets/vendor-[hash].js" as="script" />
<link rel="preload" href="/assets/index-[hash].css" as="style" />
```

## Vite-Specific Optimization

### Build Process
Vite's build process automatically:
1. Bundles and minifies JavaScript/CSS
2. Adds hashes to filenames for cache busting
3. Optimizes resource loading
4. Generates preload directives for critical assets

### Configuration
In `vite.config.ts`, you can configure optimization:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor dependencies
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          // Split UI components
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        }
      }
    }
  }
});
```

## Best Practices

### 1. Development Environment
- Remove manual preload directives
- Let Vite's hot module replacement (HMR) handle updates
- Focus on code quality rather than micro-optimizations

### 2. Production Environment
- Use Vite's build process
- Let the build tool generate appropriate preload directives
- Test performance with real user conditions

### 3. When to Use Preloading
Preload resources only when:
- They are critical for initial rendering
- They are discovered late in the parsing process
- You have verified they improve performance metrics

### 4. Testing Performance
Use browser dev tools to:
- Check Network tab for unused preloaded resources
- Monitor Performance tab for loading bottlenecks
- Verify Core Web Vitals metrics

## Common Mistakes to Avoid

### 1. Preloading Non-Critical Resources
```html
<!-- ❌ Don't preload everything -->
<link rel="preload" href="/large-image.jpg" as="image" />
<link rel="preload" href="/ rarely-used-feature.js" as="script" />
```

### 2. Preloading Source Files
```html
<!-- ❌ Don't preload source files -->
<link rel="preload" href="/src/component.tsx" as="script" />
```

### 3. Incorrect `as` Attributes
```html
<!-- ❌ Mismatched as attribute -->
<link rel="preload" href="/style.css" as="script" />

<!-- ✅ Correct as attribute -->
<link rel="preload" href="/style.css" as="style" />
```

## Monitoring and Debugging

### Browser Dev Tools
1. **Network Tab**: Check for "preload" initiator
2. **Console**: Look for preload warnings
3. **Application Tab**: Verify service worker behavior
4. **Performance Tab**: Analyze loading waterfall

### Performance Metrics
Monitor these Core Web Vitals:
- **LCP (Largest Contentful Paint)**
- **FID (First Input Delay)**
- **CLS (Cumulative Layout Shift)**

## Conclusion

The preload warning is harmless but indicates a misconfiguration. By removing the problematic preload directive and letting Vite handle resource optimization, you'll have a cleaner, more maintainable setup that performs well in both development and production environments.

For production deployments:
1. Use Vite's build process
2. Let the build tool generate appropriate optimizations
3. Test with real user conditions
4. Monitor performance metrics