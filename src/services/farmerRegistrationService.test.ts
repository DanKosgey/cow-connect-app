import { FarmerRegistrationService, type FarmerRegistrationData } from './farmerRegistrationService';

// Mock the supabase client
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn()
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockReturnThis(),
      getPublicUrl: jest.fn()
    }
  }
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the notification service
jest.mock('./notification-service', () => ({
  notificationService: {
    sendAdminNotification: jest.fn()
  }
}));

describe('FarmerRegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRegistrationData', () => {
    it('should validate valid registration data', () => {
      const validData: FarmerRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      const result = FarmerRegistrationService.validateRegistrationData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const invalidData: FarmerRegistrationData = {
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      const result = FarmerRegistrationService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject short password', () => {
      const invalidData: FarmerRegistrationData = {
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      const result = FarmerRegistrationService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters');
    });

    it('should reject mismatched passwords', () => {
      const invalidData: FarmerRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      const result = FarmerRegistrationService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Passwords do not match');
    });
  });

  describe('startRegistration', () => {
    it('should start registration successfully', async () => {
      const mockAuthData = {
        user: { id: 'user-123' },
        error: null
      };

      const { supabase } = await import('../integrations/supabase/client');
      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthData);

      const registrationData: FarmerRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      const result = await FarmerRegistrationService.startRegistration(registrationData);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.message).toBe('Registration started successfully. Please check your email to confirm your account.');
      
      // Check that data was stored in localStorage
      const storedData = localStorage.getItem('pending_profile');
      expect(storedData).not.toBeNull();
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        expect(parsedData.userId).toBe('user-123');
        expect(parsedData.email).toBe('test@example.com');
        expect(parsedData.fullName).toBe('John Doe');
      }
    });

    it('should handle authentication errors', async () => {
      const mockAuthError = {
        user: null,
        error: { message: 'Email already exists' }
      };

      const { supabase } = await import('../integrations/supabase/client');
      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthError);

      const registrationData: FarmerRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Main St, Nairobi',
        farmLocation: 'Nairobi, Kenya'
      };

      await expect(FarmerRegistrationService.startRegistration(registrationData))
        .rejects
        .toThrow('Authentication failed: Email already exists');
    });
  });

  describe('completeRegistration', () => {
    it('should complete registration successfully', async () => {
      // Mock the database responses
      const { supabase } = await import('../integrations/supabase/client');
      
      // Mock profile upsert
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'user_roles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'farmers') {
          return {
            upsert: jest.fn().mockResolvedValue({
              data: [{ id: 'farmer-123' }],
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'farmer_analytics') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return supabase;
      });

      const pendingData = {
        userId: 'user-123',
        fullName: 'John Doe',
        email: 'test@example.com',
        phone: '+254712345678',
        role: 'farmer',
        createdAt: new Date().toISOString(),
        farmerData: {
          nationalId: '12345678',
          address: '123 Main St, Nairobi',
          farmLocation: 'Nairobi, Kenya'
        }
      };

      const result = await FarmerRegistrationService.completeRegistration('user-123', pendingData);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.farmerId).toBe('farmer-123');
      expect(result.message).toBe('Registration completed successfully. Please upload your documents to complete the process.');
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const { supabase } = await import('../integrations/supabase/client');
      
      // Mock storage upload
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null })
      });
      
      // Mock document insert
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'kyc_documents') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ id: 'doc-123' }],
              error: null
            }),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis()
          };
        } else if (table === 'farmers') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{ full_name: 'John Doe' }],
              error: null
            }),
            single: jest.fn().mockReturnThis()
          };
        }
        return supabase;
      });

      const mockFile = new File([''], 'test-document.pdf', { type: 'application/pdf' });
      const result = await FarmerRegistrationService.uploadDocument('farmer-123', mockFile, 'national_id_front');
      
      expect(result).toEqual({ id: 'doc-123' });
    });
  });
});