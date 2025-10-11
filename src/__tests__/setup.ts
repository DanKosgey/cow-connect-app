// Setup file for tests
import { vi } from 'vitest';

// Mock environment variables
const mockEnv = {
  DEV: true,
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key'
};

// Create a proxy to handle import.meta.env access
const mockImportMeta = new Proxy({}, {
  get(target, prop) {
    if (prop === 'env') {
      return mockEnv;
    }
    return target[prop as keyof typeof target];
  }
});

// @ts-ignore
global.import = {
  meta: mockImportMeta
};