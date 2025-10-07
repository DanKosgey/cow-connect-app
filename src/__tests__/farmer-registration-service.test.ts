import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FarmerRegistrationService } from '../services/farmerRegistrationService';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
};

// Mock the supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock localStorage
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

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
    dob: '1990-01-01',
    gender: 'male',
    address: '123 Farm Road, Nairobi',
    
    // Farm details
    farmName: 'Test Farm',
    farmLocation: 'Nairobi',
    farmSize: 10,
    experience: 5,
    numCows: 20,
    numDairyCows: 15,
    primaryBreed: 'Friesian',
    avgProduction: 100,
    farmingType: 'dairy',
    additionalInfo: 'Test farm additional info',
    
    // Bank details
    bankName: 'Test Bank',
    accountNumber: '1234567890',
    accountName: 'Test Farmer Account'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
    
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockImplementation((data) => {
        // Check if this is inserting into farmers table with kyc_status
        if (data && data[0] && data[0].kyc_status) {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: { id: 'test-farmer-id', kyc_status: 'pending' } 
              })
            })
          };
        }
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
      })
    });
    
    mockSupabase.rpc.mockResolvedValue({ error: null });
  });

  describe('startRegistration', () => {
    it('should create user account successfully', async () => {
      await FarmerRegistrationService.startRegistration(mockFarmerData);
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
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
      await FarmerRegistrationService.startRegistration(mockFarmerData);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pending_profile',
        expect.stringContaining('Test Farmer')
      );
      
      // Check that the stored data has the correct structure
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData).toHaveProperty('userId');
      expect(storedData).toHaveProperty('fullName', 'Test Farmer');
      expect(storedData).toHaveProperty('farmerData');
      expect(storedData.farmerData).toHaveProperty('nationalId', '12345678');
    });

    it('should throw error when user account creation fails', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
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