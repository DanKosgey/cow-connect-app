export type Database = {
  public: {
    Tables: {
      farmers: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string
          location: string
          national_id: string
          is_active: boolean
          profile_status: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone: string
          location: string
          national_id: string
          is_active?: boolean
          profile_status?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string
          location?: string
          national_id?: string
          is_active?: boolean
          profile_status?: string
        }
      }
      collections: {
        Row: {
          id: string
          created_at: string
          farmer_id: string
          date: string
          quantity_liters: number
          quality_grade: string
          price_per_liter: number
          total_amount: number
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          farmer_id: string
          date: string
          quantity_liters: number
          quality_grade: string
          price_per_liter: number
          total_amount?: number
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          farmer_id?: string
          date?: string
          quantity_liters?: number
          quality_grade?: string
          price_per_liter?: number
          total_amount?: number
          status?: string
        }
      }
      payments: {
        Row: {
          id: string
          created_at: string
          farmer_id: string
          amount: number
          status: string
          payment_date: string
          payment_method: string
          reference: string
        }
        Insert: {
          id?: string
          created_at?: string
          farmer_id: string
          amount: number
          status?: string
          payment_date: string
          payment_method: string
          reference: string
        }
        Update: {
          id?: string
          created_at?: string
          farmer_id?: string
          amount?: number
          status?: string
          payment_date?: string
          payment_method?: string
          reference?: string
        }
      }
      quality_tests: {
        Row: {
          id: string
          created_at: string
          collection_id: string
          fat_content: number
          protein_content: number
          bacteria_count: number
          somatic_cell_count: number
          antibiotics_presence: boolean
          test_date: string
          remarks: string
        }
        Insert: {
          id?: string
          created_at?: string
          collection_id: string
          fat_content: number
          protein_content: number
          bacteria_count: number
          somatic_cell_count: number
          antibiotics_presence: boolean
          test_date: string
          remarks?: string
        }
        Update: {
          id?: string
          created_at?: string
          collection_id?: string
          fat_content?: number
          protein_content?: number
          bacteria_count?: number
          somatic_cell_count?: number
          antibiotics_presence?: boolean
          test_date?: string
          remarks?: string
        }
      }
      staff: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string
          role: string
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone: string
          role: string
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string
          role?: string
          is_active?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      quality_grade: 'A' | 'B' | 'C' | 'D' | 'F'
      payment_status: 'pending' | 'completed' | 'failed'
      payment_method: 'mpesa' | 'bank_transfer' | 'cash'
      profile_status: 'pending' | 'approved' | 'rejected'
      staff_role: 'admin' | 'manager' | 'field_agent'
    }
  }
}