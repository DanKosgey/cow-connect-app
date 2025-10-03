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
      auth_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      login_attempts: {
        Row: {
          id: string
          email: string
          ip_address: string
          attempt_time: string
          is_successful: boolean
        }
        Insert: {
          id?: string
          email: string
          ip_address: string
          attempt_time?: string
          is_successful?: boolean
        }
        Update: {
          id?: string
          email?: string
          ip_address?: string
          attempt_time?: string
          is_successful?: boolean
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'staff' | 'farmer'
          profile_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'staff' | 'farmer'
          profile_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'staff' | 'farmer'
          profile_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          refresh_token: string | null
          expires_at: string
          created_at: string
          updated_at: string
          last_activity: string
          ip_address: string | null
          user_agent: string | null
          is_valid: boolean
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          refresh_token?: string | null
          expires_at: string
          created_at?: string
          updated_at?: string
          last_activity?: string
          ip_address?: string | null
          user_agent?: string | null
          is_valid?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          refresh_token?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
          last_activity?: string
          ip_address?: string | null
          user_agent?: string | null
          is_valid?: boolean
        }
      }
    }
    Functions: {
      check_account_lockout: {
        Args: {
          p_email: string
          p_ip_address?: string
        }
        Returns: boolean
      }
      check_permission: {
        Args: {
          p_user_id: string
          p_permission: string
        }
        Returns: boolean
      }
      get_session_timeout: {
        Args: {
          user_role: 'admin' | 'staff' | 'farmer'
        }
        Returns: unknown
      }
    }
    Enums: {
      user_role_type: 'admin' | 'staff' | 'farmer'
    }
  }
}