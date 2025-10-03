export * from './collection';
export * from './payment';
export * from './route';
export * from './bulkCollection';
export * from './farmerManagement';
export * from './adminDashboard';
export * from './systemConfig';
export * from './userManagement';
export * from './notification';
export * from './error';

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  location_coordinates?: {
    latitude: number;
    longitude: number;
  };
  national_id: string;
  gov_id_url?: string;
  selfie_url?: string;
  qr_code?: string;
  nfc_uid?: string;
  kyc_status?: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  approved_at?: string;
  rejected_reason?: string;
  card_issued?: boolean;
  daily_validation_code?: string;
  total_collections?: number;
  total_volume?: number;
  total_earnings?: number;
  last_collection_date?: string;
}

export interface Cow {
  id: string;
  farmer_id: string;
  breed: string;
  birth_year: number;
  is_pregnant: boolean;
  expected_calving_date?: string;
  lactation_stage: 'early' | 'peak' | 'mid' | 'late' | 'dry';
  photos: string[];
  health_score: number;
  last_yield: number;
  avg_yield_30_days: number;
  created_at: string;
}

export interface Collection {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  staff_id: string;
  staff_name?: string;
  liters: number;
  gps_latitude: number;
  gps_longitude: number;
  photo_url?: string;
  timestamp: string;
  tx_hash?: string;
  validation_code?: string;
  quality_grade: 'A' | 'B' | 'C';
  temperature: number;
  fat_content?: number;
  protein_content?: number;
  idempotency_key?: string;
}

export interface Payment {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  period_month: string;
  total_liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'failed';
  paid_at?: string;
  tx_reference: string;
  payment_method: 'mpesa' | 'bank' | 'paystack';
  phone_number?: string;
  account_number?: string;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'FIELD_AGENT' | 'SUPERVISOR' | 'ADMIN' | 'PROCESSOR';
  is_active: boolean;
  last_active_at?: string;
  assigned_routes?: string[];
  created_at: string;
}

// Updated DashboardStats interface to include growth percentages
export interface DashboardStats {
  total_farmers: number;
  active_collections: number;
  monthly_revenue: number;
  quality_distribution: Record<string, number>;
  farmer_growth_percentage?: number;
  collection_growth_percentage?: number;
  revenue_growth_percentage?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}