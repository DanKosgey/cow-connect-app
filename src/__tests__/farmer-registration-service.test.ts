import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarmerRegistrationService } from '../services/farmerRegistrationService';

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

// Mock the entire supabase client module
vi.mock('../integrations/supabase/client.ts', async () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn()
    }
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('FarmerRegistrationService', () => {
  const mockFarmerData = {
    // User auth data
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    fullName: 'Test Farmer',
    phone: '+254712345678',
    
    // Personal information
    nationalId: '12345678',
    address: '123 Farm Road, Nairobi',
    farmLocation: 'Nairobi'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mocked supabase client
    const { supabase } = require('../integrations/supabase/client.ts');
    
    // Setup default mock responses
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
    
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null })
        };
      } else if (table === 'user_roles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null })
        };
      } else if (table === 'farmers') {
        return {
          upsert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              error: null, 
              data: { id: 'test-farmer-id', kyc_status: 'pending' } 
            })
          })),
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-farmer-id', full_name: 'Test Farmer' } })
          }),
          eq: vi.fn().mockReturnThis()
        };
      } else if (table === 'farmer_analytics') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null })
        };
      } else if (table === 'kyc_documents') {
        return {
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-doc-id' } })
          }))
        };
      }
      return {
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
      };
    });
    
    supabase.rpc.mockResolvedValue({ error: null });
    
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } })
    });
  });

  describe('startRegistration', () => {
    it('should create user account successfully', async () => {
      const { supabase } = require('../integrations/supabase/client.ts');
      
      await FarmerRegistrationService.startRegistration(mockFarmerData);
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: mockFarmerData.email,
        password: mockFarmerData.password,
        options: {
          emailRedirectTo: expect.any(String),
          data: {
            full_name: mockFarmerData.fullName,
            phone: mockFarmerData.phone,
            role: 'farmer'
          }
        }
      });
    });

    it('should store pending registration data in localStorage with correct structure', async () => {
      const { localStorage } = window;
      
      await FarmerRegistrationService.startRegistration(mockFarmerData);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pending_profile',
        expect.stringContaining('Test Farmer')
      );
      
      // Check that the stored data has the correct structure
      const storedData = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);
      expect(storedData).toHaveProperty('userId');
      expect(storedData).toHaveProperty('fullName', 'Test Farmer');
      expect(storedData).toHaveProperty('farmerData');
      expect(storedData.farmerData).toHaveProperty('nationalId', '12345678');
    });

    it('should throw error when user account creation fails', async () => {
      const { supabase } = require('../integrations/supabase/client.ts');
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth failed' }
      });

      await expect(FarmerRegistrationService.startRegistration(mockFarmerData))
        .rejects
        .toThrow('Failed to create user account');
    });
  });

  describe('validateRegistrationData', () => {
    it('should validate correct data', () => {
      const result = FarmerRegistrationService.validateRegistrationData(mockFarmerData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const invalidData = { ...mockFarmerData, email: 'invalid-email' };
      const result = FarmerRegistrationService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject short password', () => {
      const invalidData = { ...mockFarmerData, password: '123', confirmPassword: '123' };
      const result = FarmerRegistrationService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters');
    });
  });
});