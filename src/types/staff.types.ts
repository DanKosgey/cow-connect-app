import { Database } from './database.types';

export type CollectionPoint = Database['public']['Tables']['collection_points']['Row'];
export type Route = Database['public']['Tables']['routes']['Row'];
export type StaffRoute = Database['public']['Tables']['staff_routes']['Row'];
export type MilkCollection = Database['public']['Tables']['milk_collections']['Row'];
export type StaffPerformance = Database['public']['Views']['staff_performance']['Row'];

export type QualityGrade = 'A' | 'B' | 'C' | 'D';
export type SyncStatus = 'pending' | 'synced' | 'error';

export interface AssignedFarmer {
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
}

export interface CollectionFormData {
  farmer_id: string;
  collection_point_id: string;
  quantity: number;
  quality_grade: QualityGrade;
  temperature?: number;
  photo_url?: string;
  latitude: number;
  longitude: number;
  local_id: string;
  device_timestamp: string;
}

export interface OfflineCollection extends CollectionFormData {
  id: string;
  sync_status: SyncStatus;
  sync_error?: string;
  created_at: string;
}

export interface RoutePoint {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  status: 'pending' | 'completed' | 'partial';
  farmers: Array<{
    id: string;
    name: string;
    status: 'pending' | 'completed';
  }>;
}

export interface DailyStats {
  total_collections: number;
  total_quantity: number;
  farmers_served: number;
  quality_score: number;
  quantity_rank: number;
  quality_rank: number;
  completion_rate: number;
  efficiency_score: number;
}

export interface WeeklyStats extends DailyStats {
  trend: 'up' | 'down' | 'stable';
  target_achievement: number;
}

export interface MonthlyStats extends WeeklyStats {
  bonus_achievement: number;
  performance_rating: number;
}