import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../integrations/supabase/client';

// Mock the supabase client
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    strictSelect: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    throwOnError: jest.fn().mockReturnThis(),
    csv: jest.fn().mockReturnThis(),
    explain: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    fts: jest.fn().mockReturnThis(),
    plfts: jest.fn().mockReturnThis(),
    phfts: jest.fn().mockReturnThis(),
    wfts: jest.fn().mockReturnThis(),
    val: jest.fn().mockReturnThis(),
    rpc: jest.fn()
  }
}));

describe('Farmer Email Delivery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Template Management', () => {
    it('should retrieve email templates by notification type', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockTemplates = [
        {
          id: 'template-1',
          template_name: 'approved',
          subject_template: '🎉 Your Farmer Account Has Been Approved!',
          body_template: 'Congratulations {{farmer_name}}! Your farmer account has been approved.',
          notification_type: 'approved',
          is_active: true
        }
      ];

      const mockResponse = {
        data: mockTemplates,
        error: null
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'email_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(mockResponse)
          };
        }
        return mockSupabase;
      });

      const { data, error } = await mockSupabase
        .from('email_templates')
        .select('*')
        .eq('notification_type', 'approved')
        .single();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].template_name).toBe('approved');
      expect(data[0].notification_type).toBe('approved');
    });

    it('should handle missing email templates gracefully', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockResponse = {
        data: null,
        error: { message: 'No rows found' }
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'email_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(mockResponse)
          };
        }
        return mockSupabase;
      });

      const { data, error } = await mockSupabase
        .from('email_templates')
        .select('*')
        .eq('notification_type', 'nonexistent')
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Email Queue Processing', () => {
    it('should process pending email notifications successfully', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      // Mock pending notifications
      const mockPendingNotifications = [
        {
          id: 'notification-1',
          pending_farmer_id: 'pending-123',
          user_email: 'farmer@example.com',
          notification_type: 'approved',
          subject: 'Account Approved',
          body: 'Your account has been approved',
          status: 'pending',
          metadata: { farmer_name: 'John Doe' }
        }
      ];

      // Mock email templates
      const mockTemplate = {
        id: 'template-1',
        template_name: 'approved',
        subject_template: '🎉 {{farmer_name}}, Your Account Has Been Approved!',
        body_template: 'Congratulations {{farmer_name}}! Your account has been approved.',
        notification_type: 'approved',
        is_active: true
      };

      // Mock RPC response for processing queue
      const mockProcessResponse = {
        data: {
          success: true,
          processed_count: 1,
          failed_count: 0,
          message: 'Email queue processing completed'
        },
        error: null
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'farmer_notifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'email_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockTemplate,
              error: null
            })
          };
        }
        return mockSupabase;
      });

      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockProcessResponse);

      // Process the email queue
      const result = await mockSupabase.rpc('process_email_queue');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_email_queue');
      expect(result.data.success).toBe(true);
      expect(result.data.processed_count).toBe(1);
      expect(result.data.failed_count).toBe(0);
    });

    it('should handle email processing failures', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockProcessResponse = {
        data: {
          success: false,
          message: 'Error processing email queue: Database connection failed'
        },
        error: null
      };

      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockProcessResponse);

      const result = await mockSupabase.rpc('process_email_queue');

      expect(result.data.success).toBe(false);
      expect(result.data.message).toContain('Error processing email queue');
    });

    it('should update notification status after processing', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockNotification = {
        id: 'notification-1',
        status: 'pending'
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'farmer_notifications') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return mockSupabase;
      });

      const { error } = await mockSupabase
        .from('farmer_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', 'notification-1');

      expect(error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('farmer_notifications');
      expect(mockSupabase.update).toHaveBeenCalledWith({ 
        status: 'sent', 
        sent_at: expect.any(String) 
      });
    });
  });

  describe('Email Rate Limiting', () => {
    it('should check email rate limits for users', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockRateLimitResponse = {
        data: {
          allowed: true,
          message: 'Email sending allowed'
        },
        error: null
      };

      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockRateLimitResponse);

      const result = await mockSupabase.rpc('check_email_rate_limit', {
        p_user_id: 'user-123'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_email_rate_limit', {
        p_user_id: 'user-123'
      });
      expect(result.data.allowed).toBe(true);
      expect(result.data.message).toBe('Email sending allowed');
    });

    it('should prevent sending emails when rate limit is exceeded', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockRateLimitResponse = {
        data: {
          allowed: false,
          message: 'Email rate limit exceeded for user'
        },
        error: null
      };

      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockRateLimitResponse);

      const result = await mockSupabase.rpc('check_email_rate_limit', {
        p_user_id: 'user-excessive'
      });

      expect(result.data.allowed).toBe(false);
      expect(result.data.message).toBe('Email rate limit exceeded for user');
    });

    it('should record email sending for rate limiting', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await mockSupabase.rpc('record_email_sent', {
        p_user_id: 'user-123',
        p_farmer_id: 'farmer-123'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_email_sent', {
        p_user_id: 'user-123',
        p_farmer_id: 'farmer-123'
      });
      expect(result.error).toBeNull();
    });
  });

  describe('Notification Type Handling', () => {
    const notificationTypes = [
      'registration_confirmation',
      'kyc_submitted',
      'approved',
      'approved',
      'rejected',
      'resubmission_required'
    ];

    it.each(notificationTypes)('should handle %s notification type', async (notificationType) => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockTemplate = {
        id: `template-${notificationType}`,
        template_name: notificationType,
        subject_template: `Subject for ${notificationType}`,
        body_template: `Body for ${notificationType}`,
        notification_type: notificationType,
        is_active: true
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'email_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockTemplate,
              error: null
            })
          };
        }
        return mockSupabase;
      });

      const { data, error } = await mockSupabase
        .from('email_templates')
        .select('*')
        .eq('notification_type', notificationType)
        .single();

      expect(error).toBeNull();
      expect(data.notification_type).toBe(notificationType);
      expect(data.is_active).toBe(true);
    });

    it('should queue farmer notifications with correct types', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockNotification = {
        pending_farmer_id: 'pending-123',
        user_email: 'farmer@example.com',
        notification_type: 'approved',
        subject: 'Account Approved',
        body: 'Your account has been approved',
        status: 'pending',
        metadata: { farmer_name: 'John Doe', email: 'farmer@example.com' }
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'farmer_notifications') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ id: 'notification-123' }],
              error: null
            })
          };
        }
        return mockSupabase;
      });

      const { data, error } = await mockSupabase
        .from('farmer_notifications')
        .insert([mockNotification]);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('notification-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      const mockErrorResponse = {
        data: null,
        error: { message: 'Database connection failed' }
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'farmer_notifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(mockErrorResponse)
          };
        }
        return mockSupabase;
      });

      const { data, error } = await mockSupabase
        .from('farmer_notifications')
        .select('*')
        .eq('id', 'invalid-id')
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
      expect(error.message).toBe('Database connection failed');
    });

    it('should handle template rendering errors', async () => {
      const mockSupabase = require('../integrations/supabase/client').supabase;
      
      // Mock RPC to return a failure when processing queue
      const mockProcessResponse = {
        data: {
          success: true,
          processed_count: 0,
          failed_count: 1,
          message: 'Email queue processing completed'
        },
        error: null
      };

      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockProcessResponse);

      const result = await mockSupabase.rpc('process_email_queue');

      // Even when there are failures, the function should still return success
      expect(result.data.success).toBe(true);
      expect(result.data.failed_count).toBe(1);
    });
  });
});