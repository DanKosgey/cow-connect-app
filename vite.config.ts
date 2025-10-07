/// <reference types="vitest" />
import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Split vendor chunks for better caching
    splitVendorChunkPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Build optimizations
  build: {
    // Reduce bundle size
    target: 'es2015',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Generate manifest for service worker
    manifest: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500,
    // Enable tree shaking
    rollupOptions: {
      // External dependencies that shouldn't be bundled
      external: [],
      output: {
        // Separate vendor and app code for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.match(/react|react-dom|react-router-dom/)) return 'react-vendor';
            if (id.match(/@radix-ui\//)) return 'radix-ui-core';
            if (id.match(/@tanstack\/react-query|@supabase\/supabase-js/)) return 'data-vendor';
            if (id.match(/recharts/)) return 'chart-vendor';
            if (id.match(/date-fns|lucide-react|clsx|tailwind-merge|class-variance-authority/)) return 'util-vendor';
            if (id.match(/react-hook-form|@hookform\/resolvers|zod/)) return 'form-vendor';
            if (id.match(/sonner|cmdk|input-otp|react-day-picker|react-resizable-panels|embla-carousel-react/)) return 'ui-vendor';
            if (id.match(/xlsx|exceljs/)) return 'excel-vendor';
          }
        },
        
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    
    // Enable minification
    minify: 'esbuild',
    
    // Enable brotli compression
    brotliSize: true,
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-popover',
        '@radix-ui/react-slot',
        '@tanstack/react-query',
        '@supabase/supabase-js',
        'recharts',
        'date-fns',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'react-hook-form',
        '@hookform/resolvers',
        'zod',
        'sonner',
        'cmdk',
        'input-otp',
        'react-day-picker',
        'react-resizable-panels',
        'embla-carousel-react',
        'xlsx',
        'exceljs'
      ]
    }
  },
  
  // Enable CSS optimization
  css: {
    postcss: './postcss.config.js',
  },
  
  // Add cache headers for static assets
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
}));