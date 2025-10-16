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
      payments: {
        Row: {
          id: string;
          farmer_id: string;
          amount: number;
          period_start: string;
          period_end: string;
          paid_at: string | null;
          payment_method: string | null;
          transaction_id: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          amount: number;
          period_start: string;
          period_end: string;
          paid_at?: string | null;
          payment_method?: string | null;
          transaction_id?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          amount?: number;
          period_start?: string;
          period_end?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          transaction_id?: string | null;
          status?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      milk_rates: {
        Row: {
          id: string;
          rate_per_liter: number;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          rate_per_liter: number;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          rate_per_liter?: number;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      farmer_analytics: {
        Row: {
          id: string;
          farmer_id: string;
          total_collections: number;
          total_liters: number;
          avg_quality_score: number;
          current_month_liters: number;
          current_month_earnings: number;
          last_collection_date: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          total_collections?: number;
          total_liters?: number;
          avg_quality_score?: number;
          current_month_liters?: number;
          current_month_earnings?: number;
          last_collection_date?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          total_collections?: number;
          total_liters?: number;
          avg_quality_score?: number;
          current_month_liters?: number;
          current_month_earnings?: number;
          last_collection_date?: string;
          updated_at?: string;
        };
      };
      pending_farmers: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string;
          phone_number: string | null;
          gender: string | null;
          national_id: string | null;
          address: string | null;
          farm_location: string | null;
          number_of_cows: number | null;
          feeding_type: string | null;
          status: string;
          email_verified: boolean;
          registration_number: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          // NEW FIELDS ADDED FOR FARMER REGISTRATION SPECIFICATION
          age: number | null;
          id_number: string | null;
          breeding_method: string | null;
          cow_breeds: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          email: string;
          phone_number?: string | null;
          gender?: string | null;
          national_id?: string | null;
          address?: string | null;
          farm_location?: string | null;
          number_of_cows?: number | null;
          feeding_type?: string | null;
          status?: string;
          email_verified?: boolean;
          registration_number?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          // NEW FIELDS ADDED FOR FARMER REGISTRATION SPECIFICATION
          age?: number | null;
          id_number?: string | null;
          breeding_method?: string | null;
          cow_breeds?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          email?: string;
          phone_number?: string | null;
          gender?: string | null;
          national_id?: string | null;
          address?: string | null;
          farm_location?: string | null;
          number_of_cows?: number | null;
          feeding_type?: string | null;
          status?: string;
          email_verified?: boolean;
          registration_number?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          // NEW FIELDS ADDED FOR FARMER REGISTRATION SPECIFICATION
          age?: number | null;
          id_number?: string | null;
          breeding_method?: string | null;
          cow_breeds?: Json | null;
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
      user_permissions: {
        Row: {
          id: string;
          role: 'admin' | 'staff' | 'farmer';
          permission: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role: 'admin' | 'staff' | 'farmer';
          permission: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'admin' | 'staff' | 'farmer';
          permission?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
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
      farmer_payments: {
        Row: {
          id: string;
          farmer_id: string;
          collection_ids: string[];
          total_amount: number;
          approval_status: string;
          approved_at: string | null;
          paid_at: string | null;
          notes: string | null;
          processed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          collection_ids: string[];
          total_amount: number;
          approval_status?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          processed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          collection_ids?: string[];
          total_amount?: number;
          approval_status?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          processed_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
      forum_posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string;
          created_at: string;
          updated_at: string;
          likes: number;
          comments: number;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          author_id: string;
          created_at?: string;
          updated_at?: string;
          likes?: number;
          comments?: number;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          author_id?: string;
          created_at?: string;
          updated_at?: string;
          likes?: number;
          comments?: number;
        };
      };
      forum_comments: {
        Row: {
          id: string;
          post_id: string;
          content: string;
          author_id: string;
          created_at: string;
          likes: number;
        };
        Insert: {
          id?: string;
          post_id: string;
          content: string;
          author_id: string;
          created_at?: string;
          likes?: number;
        };
        Update: {
          id?: string;
          post_id?: string;
          content?: string;
          author_id?: string;
          created_at?: string;
          likes?: number;
        };
      };
      notifications: {
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
      get_admin_dashboard_metrics: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: {
          total_farmers: number;
          active_farmers: number;
          total_collections: number;
          total_liters: number;
          total_revenue: number;
          pending_payments: number;
          avg_quality_score: number;
          staff_count: number;
        };
      };
      get_admin_collection_trends: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: Array<{
          date: string;
          collections: number;
          liters: number;
          revenue: number;
          farmers: number;
        }>;
      };
      get_admin_quality_distribution: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: Array<{
          quality_grade: string;
          count: number;
          percentage: number;
        }>;
      };
      get_admin_revenue_trends: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: Array<{
          date: string;
          revenue: number;
          collections: number;
          avg_amount: number;
        }>;
      };
      get_admin_farmer_analytics_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_farmers: number;
          kyc_approved: number;
          kyc_pending: number;
          kyc_rejected: number;
          avg_collections_per_farmer: number;
          avg_liters_per_farmer: number;
        };
      };
      get_admin_payment_summary: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: {
          total_payments: number;
          total_amount: number;
          pending_payments: number;
          pending_amount: number;
          completed_payments: number;
          completed_amount: number;
          failed_payments: number;
          failed_amount: number;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];