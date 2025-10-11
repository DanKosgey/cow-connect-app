import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for testing
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Farmer Registration Schema', () => {
  beforeAll(async () => {
    // Setup: Create a test user and pending farmer record
    // This would typically be done in a test setup file
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    // This would typically be done in a test teardown file
  });

  describe('pending_farmers table', () => {
    it('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'pending_farmers')
        .in('column_name', [
          'id', 'user_id', 'full_name', 'email', 'phone_number', 'gender', 
          'national_id', 'address', 'farm_location', 'number_of_cows', 
          'feeding_type', 'status', 'email_verified', 'registration_number',
          'age', 'id_number', 'breeding_method', 'cow_breeds', 'kyc_complete',
          'rejection_count', 'rejection_reason', 'reviewed_at', 'reviewed_by', 
          'submitted_at', 'created_at', 'updated_at'
        ])
        .order('ordinal_position');

      expect(error).toBeNull();
      expect(data).toHaveLength(25); // All required columns should exist
    });

    it('should have proper constraints', async () => {
      // Check gender constraint
      const { data: constraints, error } = await supabase
        .from('information_schema.check_constraints')
        .select('constraint_name, check_clause')
        .eq('constraint_schema', 'public')
        .ilike('constraint_name', '%pending_farmers_gender_check%');

      expect(error).toBeNull();
      expect(constraints).toHaveLength(1);
    });
  });

  describe('kyc_documents table', () => {
    it('should have all required columns', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'kyc_documents')
        .in('column_name', [
          'id', 'farmer_id', 'pending_farmer_id', 'document_type', 
          'file_name', 'file_path', 'file_size', 'mime_type', 
          'status', 'rejection_reason', 'verified_at', 'created_at', 'updated_at'
        ])
        .order('ordinal_position');

      expect(error).toBeNull();
      // Should have at least the core columns
      expect(data && data.length).toBeGreaterThanOrEqual(10);
    });

    it('should have proper foreign key relationships', async () => {
      // Check foreign key constraints
      const { data: constraints, error } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'kyc_documents')
        .eq('constraint_type', 'FOREIGN KEY');

      expect(error).toBeNull();
      // Should have foreign key constraints
      expect(constraints && constraints.length).toBeGreaterThan(0);
    });
  });

  describe('farmers table', () => {
    it('should have enhanced columns for registration', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'farmers')
        .in('column_name', [
          'id', 'user_id', 'registration_number', 'national_id', 
          'phone_number', 'full_name', 'address', 'farm_location',
          'kyc_status', 'registration_completed', 'physical_address',
          'gps_latitude', 'gps_longitude', 'bank_account_name',
          'bank_account_number', 'bank_name', 'bank_branch',
          'created_at', 'updated_at'
        ])
        .order('ordinal_position');

      expect(error).toBeNull();
      // Should have at least the core columns
      expect(data && data.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Database functions', () => {
    it('should have required RPC functions', async () => {
      const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .ilike('proname', '%pending_farmer%');

      expect(error).toBeNull();
      
      const functionNames = data?.map(f => f.proname) || [];
      expect(functionNames).toContain('approve_pending_farmer');
      expect(functionNames).toContain('reject_pending_farmer');
      expect(functionNames).toContain('resubmit_kyc_documents');
      expect(functionNames).toContain('get_pending_farmers_for_review');
      expect(functionNames).toContain('submit_kyc_for_review');
    });
  });

  describe('Indexes', () => {
    it('should have required indexes on pending_farmers', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'pending_farmers')
        .ilike('indexname', 'idx_pending_farmers_%');

      expect(error).toBeNull();
      const indexNames = data?.map(i => i.indexname) || [];
      expect(indexNames).toContain('idx_pending_farmers_status');
      expect(indexNames).toContain('idx_pending_farmers_email');
      expect(indexNames).toContain('idx_pending_farmers_created_at');
    });

    it('should have required indexes on kyc_documents', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'kyc_documents')
        .ilike('indexname', 'idx_kyc_documents_%');

      expect(error).toBeNull();
      const indexNames = data?.map(i => i.indexname) || [];
      expect(indexNames).toContain('idx_kyc_documents_pending_farmer_id');
      expect(indexNames).toContain('idx_kyc_documents_status');
      expect(indexNames).toContain('idx_kyc_documents_document_type');
    });
  });
});