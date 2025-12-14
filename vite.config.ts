/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  
  server: {
    host: "::",
    port: 5173,
    strictPort: false,
    open: false,
  },
  
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/integrations": path.resolve(__dirname, "./src/integrations"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/contexts": path.resolve(__dirname, "./src/contexts"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/assets": path.resolve(__dirname, "./src/assets"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/routes": path.resolve(__dirname, "./src/routes"),
      "@/schemas": path.resolve(__dirname, "./src/schemas"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
      "@/config": path.resolve(__dirname, "./src/config"),
    },
    dedupe: ["react", "react-dom"],
  },
  
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
    ],
    exclude: ["lovable-tagger"],
  },
  
  build: {
    target: "es2020",
    cssCodeSplit: true,
    manifest: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === "production" ? false : true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core - highest priority
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          
          // Router
          if (id.includes("react-router")) {
            return "router";
          }
          
          // Radix UI components
          if (id.includes("@radix-ui")) {
            return "radix-ui";
          }
          
          // Data layer
          if (id.includes("@tanstack/react-query") || id.includes("@supabase")) {
            return "data-layer";
          }
          
          // Charts
          if (id.includes("recharts")) {
            return "charts";
          }
          
          // Forms
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "forms";
          }
          
          // Excel/File handling
          if (id.includes("xlsx") || id.includes("exceljs")) {
            return "excel";
          }
          
          // UI libraries that depend on React
          if (
            id.includes("sonner") ||
            id.includes("cmdk") ||
            id.includes("input-otp") ||
            id.includes("react-day-picker") ||
            id.includes("react-resizable-panels") ||
            id.includes("embla-carousel") ||
            id.includes("framer-motion") ||
            id.includes("react-transition-group") ||
            id.includes("react-window") ||
            id.includes("recharts") ||
            id.includes("react-chartjs-2")
          ) {
            return "react-ui";
          }
          
          // Utilities
          if (
            id.includes("date-fns") ||
            id.includes("lucide-react") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("class-variance-authority")
          ) {
            return "utilities";
          }
          
          // All other node_modules that might depend on React
          if (id.includes("node_modules")) {
            // Check if this module might depend on React
            if (
              id.includes("@heroicons") ||
              id.includes("@headlessui") ||
              id.includes("usehooks-ts") ||
              id.includes("react-") ||
              id.includes("@tanstack") ||
              id.includes("@floating-ui")
            ) {
              return "react-dependencies";
            }
            return "vendor";
          }
        },
        
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
        
        hoistTransitiveImports: false,
      },
    },
  },
  
  css: {
    postcss: "./postcss.config.js",
    devSourcemap: mode === "development",
  },
  
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },
  
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
      ],
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/integrations": path.resolve(__dirname, "./src/integrations"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/contexts": path.resolve(__dirname, "./src/contexts"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/assets": path.resolve(__dirname, "./src/assets"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/test": path.resolve(__dirname, "./src/test"),
      "@/routes": path.resolve(__dirname, "./src/routes"),
      "@/schemas": path.resolve(__dirname, "./src/schemas"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
      "@/config": path.resolve(__dirname, "./src/config"),
    },
  },
}));