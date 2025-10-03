// Farmer Management interfaces
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type KYCStatus = 'pending' | 'approved' | 'rejected' | 'in_review';
export type FarmerPaymentStatus = 'active' | 'suspended' | 'pending';
export type FarmerStatus = 'active' | 'suspended' | 'pending_review';

export interface CollectionSummary {
  total_collections: number;
  total_volume: number;
  last_collection_date?: string;
  avg_quality: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  location: Address;
  kyc_status: KYCStatus;
  collection_history: CollectionSummary;
  payment_status: FarmerPaymentStatus;
  quality_rating: number;
  last_collection: string; // ISO date string
  active_issues: Issue[];
  registered_at: string;
  email?: string;
  national_id: string;
  address: string;
  location_coordinates?: {
    latitude: number;
    longitude: number;
  };
  approved_at?: string;
  rejected_reason?: string;
  total_earnings?: number;
}

export interface PaginationData {
  page: number;
  size: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface FarmerListResponse {
  farmers: FarmerProfile[];
  filters: {
    available_statuses: FarmerStatus[];
    kyc_statuses: KYCStatus[];
  };
  pagination: PaginationData;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  message: string;
  message_type: 'text' | 'alert' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  read: boolean;
  read_at?: string;
}

export interface SendMessageRequest {
  recipient_id: string;
  recipient_type: 'farmer' | 'staff' | 'admin';
  message: string;
  message_type: 'text' | 'alert' | 'reminder';
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateFarmerStatusRequest {
  status: FarmerStatus;
}

export interface WebSocketMessage {
  type: 'message_received' | 'farmer_status_changed';
  data: any;
}