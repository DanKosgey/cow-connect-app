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
          farmer_id: string;
          registration_number: string;
          full_name: string;
          phone_number: string;
          email?: string;
          physical_address?: string;
          gps_latitude?: number;
          gps_longitude?: number;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_name?: string;
          bank_branch?: string;
          kyc_status: 'pending' | 'approved' | 'rejected';
          kyc_documents: Json;
          kyc_rejection_reason?: string;
          registration_date: string;
          status: 'active' | 'inactive' | 'suspended';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          farmer_id?: string;
          registration_number?: string;
          full_name: string;
          phone_number: string;
          email?: string;
          physical_address?: string;
          gps_latitude?: number;
          gps_longitude?: number;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_name?: string;
          bank_branch?: string;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          kyc_documents?: Json;
          kyc_rejection_reason?: string;
          registration_date?: string;
          status?: 'active' | 'inactive' | 'suspended';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          farmer_id?: string;
          registration_number?: string;
          full_name?: string;
          phone_number?: string;
          email?: string;
          physical_address?: string;
          gps_latitude?: number;
          gps_longitude?: number;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_name?: string;
          bank_branch?: string;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          kyc_documents?: Json;
          kyc_rejection_reason?: string;
          registration_date?: string;
          status?: 'active' | 'inactive' | 'suspended';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'staff' | 'farmer';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'staff' | 'farmer';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'staff' | 'farmer';
          created_at?: string;
        };
      };
      collection_points: {
        Row: {
          id: string;
          name: string;
          location: unknown; // PostGIS Point type
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };
      milk_collections: {
        Row: {
          id: string;
          farmer_id: string;
          staff_id: string;
          collection_point_id: string | null;
          quantity: number;
          quality_grade: string;
          temperature: number | null;
          location: unknown; // PostGIS Point type
          photo_url: string | null;
          local_id: string | null;
          sync_status: string;
          sync_error: string | null;
          device_timestamp: string;
          server_timestamp: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          staff_id: string;
          collection_point_id?: string | null;
          quantity: number;
          quality_grade: string;
          temperature?: number | null;
          location?: unknown;
          photo_url?: string | null;
          local_id?: string | null;
          sync_status?: string;
          sync_error?: string | null;
          device_timestamp: string;
          server_timestamp?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          staff_id?: string;
          collection_point_id?: string | null;
          quantity?: number;
          quality_grade?: string;
          temperature?: number | null;
          location?: unknown;
          photo_url?: string | null;
          local_id?: string | null;
          sync_status?: string;
          sync_error?: string | null;
          device_timestamp?: string;
          server_timestamp?: string;
          created_at?: string;
          updated_at?: string;
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