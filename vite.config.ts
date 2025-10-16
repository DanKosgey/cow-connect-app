/// <reference types="vitest" />
import { defineConfig } from "vite";
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe React to prevent multiple instances
    dedupe: ['react', 'react-dom']
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
        // Ensure proper loading order by putting React first
        manualChunks: {
          // React core must be loaded first
          'react': ['react'],
          'react-dom': ['react-dom'],
          // React Router (often needed early)
          'react-router': ['react-router', 'react-router-dom'],
          // Critical UI libraries
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-slot'
          ],
          // Data management
          'data': [
            '@tanstack/react-query',
            '@supabase/supabase-js'
          ],
          // Charts and visualization
          'charts': ['recharts'],
          // Form handling
          'forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          // Utilities
          'utils': [
            'date-fns',
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'class-variance-authority'
          ],
          // UI components
          'ui': [
            'sonner',
            'cmdk',
            'input-otp',
            'react-day-picker',
            'react-resizable-panels',
            'embla-carousel-react'
          ],
          // File handling
          'files': ['xlsx', 'exceljs']
        },
        
        // Optimize chunk naming and loading order
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        // Ensure proper loading order
        hoistTransitiveImports: false
      }
    },
    
    // Optimize dependencies with explicit inclusion
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
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/integrations': path.resolve(__dirname, './src/integrations'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/test': path.resolve(__dirname, './src/test'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/schemas': path.resolve(__dirname, './src/schemas'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/config': path.resolve(__dirname, './src/config')
    }
  },
}));