export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      farmers: {
        Row: {
          id: string;
          user_id: string;
          registration_number: string;
          national_id: string;
          phone_number: string;
          full_name: string;
          address: string;
          farm_location: string;
          kyc_status: 'pending' | 'approved' | 'rejected';
          registration_completed: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          // Additional fields that may exist in the database
          kyc_rejection_reason?: string | null;
          email?: string | null;
          physical_address?: string | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          registration_date?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          registration_number?: string | null;
          national_id?: string | null;
          phone_number?: string | null;
          full_name?: string | null;
          address?: string | null;
          farm_location?: string | null;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          registration_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          // Additional fields that may exist in the database
          kyc_rejection_reason?: string | null;
          email?: string | null;
          physical_address?: string | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          registration_date?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          registration_number?: string | null;
          national_id?: string | null;
          phone_number?: string | null;
          full_name?: string | null;
          address?: string | null;
          farm_location?: string | null;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          registration_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          // Additional fields that may exist in the database
          kyc_rejection_reason?: string | null;
          email?: string | null;
          physical_address?: string | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          bank_branch?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          registration_date?: string;
        };
      };
      user_roles: {
        Row: {
          id: number;
          user_id: string;
          role: 'admin' | 'staff' | 'farmer';
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          role: 'admin' | 'staff' | 'farmer';
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          role?: 'admin' | 'staff' | 'farmer';
          active?: boolean;
          created_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          collection_id: string;
          farmer_id: string;
          staff_id: string | null;
          collection_point_id: string | null;
          liters: number;
          quality_grade: 'A+' | 'A' | 'B' | 'C';
          rate_per_liter: number | null;
          total_amount: number | null;
          gps_latitude: number | null;
          gps_longitude: number | null;
          validation_code: string | null;
          verification_code: string | null;
          collection_date: string;
          status: 'Collected' | 'Verified' | 'Paid' | 'Cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id?: string;
          farmer_id: string;
          staff_id?: string | null;
          collection_point_id?: string | null;
          liters?: number;
          quality_grade?: 'A+' | 'A' | 'B' | 'C';
          rate_per_liter?: number | null;
          total_amount?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          validation_code?: string | null;
          verification_code?: string | null;
          collection_date?: string;
          status?: 'Collected' | 'Verified' | 'Paid' | 'Cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          farmer_id?: string;
          staff_id?: string | null;
          collection_point_id?: string | null;
          liters?: number;
          quality_grade?: 'A+' | 'A' | 'B' | 'C';
          rate_per_liter?: number | null;
          total_amount?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          validation_code?: string | null;
          verification_code?: string | null;
          collection_date?: string;
          status?: 'Collected' | 'Verified' | 'Paid' | 'Cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      kyc_documents: {
        Row: {
          id: string;
          farmer_id: string | null;
          document_type: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
          // Additional fields that may exist in the database
          rejection_reason?: string | null;
          verified_at?: string | null;
        };
        Insert: {
          id?: string;
          farmer_id?: string | null;
          document_type?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
          // Additional fields that may exist in the database
          rejection_reason?: string | null;
          verified_at?: string | null;
        };
        Update: {
          id?: string;
          farmer_id?: string | null;
          document_type?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
          // Additional fields that may exist in the database
          rejection_reason?: string | null;
          verified_at?: string | null;
        };
      };
      // Tables that will be created with the new migration
      routes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_points: {
        Row: {
          id: string;
          name: string;
          location: unknown; // PostGIS Point type
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: unknown;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: unknown;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      route_points: {
        Row: {
          id: string;
          route_id: string;
          collection_point_id: string;
          sequence_number: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          collection_point_id: string;
          sequence_number: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          route_id?: string;
          collection_point_id?: string;
          sequence_number?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff_routes: {
        Row: {
          id: string;
          staff_id: string;
          route_id: string | null;
          route_name: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          route_id?: string | null;
          route_name?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          route_id?: string | null;
          route_name?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      quality_tests: {
        Row: {
          id: string;
          collection_id: string;
          test_type: string;
          test_result: string;
          test_date: string;
          performed_by: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          test_type: string;
          test_result: string;
          test_date?: string;
          performed_by: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          test_type?: string;
          test_result?: string;
          test_date?: string;
          performed_by?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          unit: string;
          current_stock: number;
          reorder_level: number;
          supplier: string | null;
          cost_per_unit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          unit: string;
          current_stock: number;
          reorder_level: number;
          supplier?: string | null;
          cost_per_unit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          unit?: string;
          current_stock?: number;
          reorder_level?: number;
          supplier?: string | null;
          cost_per_unit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_transactions: {
        Row: {
          id: string;
          item_id: string;
          transaction_type: 'in' | 'out';
          quantity: number;
          unit_cost: number | null;
          total_cost: number | null;
          reason: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          transaction_type: 'in' | 'out';
          quantity: number;
          unit_cost?: number | null;
          total_cost?: number | null;
          reason?: string | null;
          performed_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          transaction_type?: 'in' | 'out';
          quantity?: number;
          unit_cost?: number | null;
          total_cost?: number | null;
          reason?: string | null;
          performed_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      admin_collection_stats: {
        Row: {
          date: string;
          unique_farmers: number;
          total_collections: number;
          total_liters: number;
          avg_liters_per_collection: number;
          quality_distribution: Json;
        };
      };
      admin_payment_stats: {
        Row: {
          date: string;
          payment_method: string;
          status: string;
          transaction_count: number;
          total_amount: number;
          avg_amount: number;
        };
      };
      admin_kyc_analytics: {
        Row: {
          date: string;
          total_applications: number;
          approved_count: number;
          rejected_count: number;
          pending_count: number;
          avg_processing_hours: number;
        };
      };
      staff_performance: {
        Row: {
          staff_id: string;
          full_name: string;
          collection_date: string;
          farmers_served: number;
          total_quantity: number;
          total_collections: number;
          quality_score: number;
          quantity_rank: number;
          quality_rank: number;
        };
      };
    };
    Functions: {
      log_system_activity: {
        Args: {
          activity_type: string;
          activity_details: Json;
          performed_by: string;
        };
        Returns: void;
      };
      get_assigned_farmers: {
        Args: {
          staff_id: string;
        };
        Returns: Array<{
          farmer_id: string;
          registration_number: string;
          full_name: string;
          phone_number: string;
          location: string;
          collection_point_id: string;
          route_sequence: number;
          last_collection_date: string | null;
          last_collection_quantity: number | null;
          avg_daily_quantity: number | null;
        }>;
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];