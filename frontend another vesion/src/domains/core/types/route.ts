// Route management interfaces
export type RouteStatus = 'planned' | 'active' | 'completed';

export interface FarmerLocation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  collection_history?: {
    last_collection_date?: string;
    avg_volume?: number;
    quality_grade?: string;
  };
}

export interface RouteData {
  id: string;
  name: string;
  assigned_staff: string;
  farmers: FarmerLocation[];
  estimated_duration: number;
  total_distance: number;
  status: RouteStatus;
  scheduled_date: Date;
}

export interface RouteOptimizationRequest {
  optimization_criteria: 'distance' | 'time' | 'priority';
}

export interface RouteOptimizationResponse {
  optimized_route: FarmerLocation[];
  estimated_savings: {
    time: number;
    distance: number;
  };
}

export interface RouteStartRequest {
  staff_location: {
    lat: number;
    lng: number;
  };
}

export interface RouteStartResponse {
  route_started_at: string;
  estimated_completion: string;
  next_farmer: {
    id: string;
    name: string;
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface RouteWebSocketEvent {
  route_id: string;
  status: RouteStatus;
  current_location?: {
    lat: number;
    lng: number;
  };
  next_stop?: {
    farmer_id: string;
    name: string;
  };
}

export interface FarmerCollectionCompletedEvent {
  route_id: string;
  farmer_id: string;
  collection_data: {
    volume: number;
    quality_grade: string;
    timestamp: string;
  };
}