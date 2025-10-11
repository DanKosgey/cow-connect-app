import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarmerRegistrationService } from '../services/farmerRegistrationService';

// Mock environment variables
const mockEnv = {
  DEV: true,
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key'
};

// @ts-ignore
import.meta.env = mockEnv;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn()
  }
});

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock the supabase client
vi.mock('../integrations/supabase/client.ts', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis()
    },
    rpc: vi.fn()
  }
}));

// Mock notification service
vi.mock('../services/notification-service', () => ({
  notificationService: {
    sendAdminNotification: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Admin Notification System - KYC Process', () => {
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mocked supabase client
    const { supabase } = require('../integrations/supabase/client.ts');
    const { notificationService } = require('../services/notification-service');
    
    // Setup default mock responses for auth
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
    
    // Setup default mock responses for database operations
    supabase.from.mockReturnValue({
      insert: vi.fn().mockImplementation((data) => {
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-farmer-id' } })
          })
        };
      }),
      update: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ error: null, data: null }),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      }),
      upsert: vi.fn().mockImplementation((data) => {
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-farmer-id' } })
          }),
          onConflict: vi.fn().mockReturnThis()
        };
      })
    });
    
    // Setup default mock responses for storage
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } })
    });
    
    supabase.rpc.mockResolvedValue({ error: null });
    
    // Setup notification service mock
    notificationService.sendAdminNotification.mockResolvedValue(undefined);
  });

  describe('Document Upload Notification', () => {
    it('should send admin notification when farmer uploads KYC document', async () => {
      const { supabase } = require('../integrations/supabase/client.ts');
      const { notificationService } = require('../services/notification-service');
      
      // Mock the farmer data for notification
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: { full_name: 'Test Farmer' }, 
                  error: null 
                })
              })
            })
          };
        }
        return {
          insert: vi.fn().mockImplementation((data) => {
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-doc-id' } })
              })
            };
          })
        };
      });

      // Call the document upload function
      await FarmerRegistrationService.uploadDocument('farmer-123', mockFile, 'national_id_front');
      
      // Verify that the notification service was called
      expect(notificationService.sendAdminNotification).toHaveBeenCalledWith(
        'New KYC Document Uploaded',
        'Test Farmer has uploaded a National ID Front for KYC verification.',
        'kyc'
      );
    });

    it('should handle notification service errors gracefully', async () => {
      const { supabase } = require('../integrations/supabase/client.ts');
      const { notificationService } = require('../services/notification-service');
      
      // Mock the farmer data
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: { full_name: 'Test Farmer' }, 
                  error: null 
                })
              })
            })
          };
        }
        return {
          insert: vi.fn().mockImplementation((data) => {
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-doc-id' } })
              })
            };
          })
        };
      });

      // Mock notification service to throw an error
      notificationService.sendAdminNotification.mockRejectedValue(new Error('Notification service error'));
      
      // The function should not throw an error even if notification fails
      await expect(FarmerRegistrationService.uploadDocument('farmer-123', mockFile, 'national_id_front'))
        .resolves
        .not
        .toThrow();
    });

    it('should use default farmer name when farmer data is not available', async () => {
      const { supabase } = require('../integrations/supabase/client.ts');
      const { notificationService } = require('../services/notification-service');
      
      // Mock the farmer data to return an error
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: null, 
                  error: new Error('Farmer not found') 
                })
              })
            })
          };
        }
        return {
          insert: vi.fn().mockImplementation((data) => {
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-doc-id' } })
              })
            };
          })
        };
      });

      // Call the document upload function
      await FarmerRegistrationService.uploadDocument('farmer-123', mockFile, 'selfie_1');
      
      // Verify that the notification service was called with default name
      expect(notificationService.sendAdminNotification).toHaveBeenCalledWith(
        'New KYC Document Uploaded',
        'A farmer has uploaded a Selfie 1 for KYC verification.',
        'kyc'
      );
    });
  });
});