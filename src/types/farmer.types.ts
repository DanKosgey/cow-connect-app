export type ProfileStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type NotificationType = 'payment' | 'collection' | 'document' | 'system';

export interface FarmerProfile {
  id: string;
  registration_number: string;
  full_name: string;
  id_number: string;
  phone_number: string;
  email?: string;
  location_coordinates?: {
    lat: number;
    lng: number;
  };
  collection_point_id?: string;
  status: ProfileStatus;
  approval_date?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface BankDetails {
  id: string;
  farmer_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code?: string;
  is_primary: boolean;
  verification_status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface FarmerDocument {
  id: string;
  farmer_id: string;
  document_type: string;
  document_number?: string;
  file_url: string;
  status: DocumentStatus;
  rejection_reason?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  farmer_id: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  payment_notifications: boolean;
  collection_notifications: boolean;
  quality_alerts: boolean;
  price_updates: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  farmer_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface PriceStructure {
  id: string;
  name: string;
  base_rate: number;
  quality_multipliers: {
    [grade: string]: number;
  };
  volume_bonuses?: {
    threshold: number;
    bonus: number;
  }[];
  loyalty_bonuses?: {
    months: number;
    bonus: number;
  }[];
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: string;
  name: string;
  frequency: string;
  payment_day: number;
  processing_days: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  farmer_id: string;
  schedule_id: string;
  period_start: string;
  period_end: string;
  total_quantity: number;
  base_amount: number;
  quality_bonus: number;
  volume_bonus: number;
  loyalty_bonus: number;
  deductions: number;
  net_amount: number;
  status: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;
  bank_account_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentDispute {
  id: string;
  farmer_id: string;
  payment_id?: string;
  collection_id?: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QualityScore {
  farmer_id: string;
  average_quality_score: number;
  total_collections: number;
  total_quantity: number;
  monthly_breakdown: Array<{
    month: string;
    score: number;
    collections: number;
    quantity: number;
  }>;
}

export interface FarmerBalance {
  farmer_id: string;
  registration_number: string;
  full_name: string;
  month_quantity: number;
  month_collections: number;
  last_collection_date?: string;
  month_paid_amount: number;
  month_pending_amount: number;
  last_payment_date?: string;
  average_quality_score: number;
  quality_history: QualityScore['monthly_breakdown'];
}

export interface RegistrationStep {
  id: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    validation?: {
      pattern?: string;
      message?: string;
      min?: number;
      max?: number;
    };
  }>;
  documents?: Array<{
    type: string;
    required: boolean;
    format: string[];
    maxSize: number;
  }>;
}

export interface FarmerRegistrationFormData {
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
}

export interface FarmerRegistrationResponse {
  success: boolean;
  message?: string;
  data?: FarmerProfile;
  error?: string;
  validation_errors?: Record<string, string[]>;
}

// API specific types
export interface FarmerListResponse {
  data: FarmerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
