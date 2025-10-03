import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/auth": path.resolve(__dirname, "./src/domains/auth"),
      "@/farmers": path.resolve(__dirname, "./src/domains/farmers"),
      "@/staff": path.resolve(__dirname, "./src/domains/staff"),
      "@/admin": path.resolve(__dirname, "./src/domains/admin"),
      "@/collections": path.resolve(__dirname, "./src/domains/collections"),
      "@/shared": path.resolve(__dirname, "./src/domains/shared"),
      "@/core": path.resolve(__dirname, "./src/core"),
    },
  },
  build: {
    outDir: 'build'
  },

  // Server configuration
  server: {
    port: 3000,
    host: '0.0.0.0', // Explicitly bind to all interfaces
    allowedHosts: true,
    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket requests to the backend server
      '/ws': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      }
    }
  }
});