// Map Service Integration Types
export type Coordinates = {
  lat: number;
  lng: number;
};

export type MapBounds = {
  northeast: Coordinates;
  southwest: Coordinates;
};

export type CollectionPoint = {
  id: string;
  name: string;
  location: Coordinates;
  status: 'active' | 'inactive';
  assignedStaff?: string;
  farmers: Array<{
    id: string;
    name: string;
    averageCollection: number;
  }>;
};

export type RouteWaypoint = {
  id: string;
  location: Coordinates;
  type: 'collection_point' | 'farmer' | 'checkpoint';
  order: number;
  estimatedTime?: string;
  actualTime?: string;
};

export type StaffRoute = {
  id: string;
  name: string;
  staffId: string;
  waypoints: RouteWaypoint[];
  status: 'planned' | 'in_progress' | 'completed';
  metrics: {
    totalDistance: number;
    estimatedDuration: number;
    actualDuration?: number;
    efficiency?: number;
  };
  geofence: {
    center: Coordinates;
    radius: number;
  };
};

// Real-time Analytics Types
export type MetricDefinition = {
  id: string;
  name: string;
  description: string;
  calculation: string;
  unit: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  historicalPeriods: number;
  refreshInterval: number;
};

export type ChartConfig = {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, any>;
  timeRange?: {
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  drilldown?: {
    dimensions: string[];
    metrics: string[];
  };
};

export type Dashboard = {
  id: string;
  name: string;
  type: 'admin' | 'staff' | 'farmer';
  charts: ChartConfig[];
  refreshInterval: number;
  filters: Record<string, any>;
};

// Report Generation Types
export type ReportTemplate = {
  id: string;
  name: string;
  type: 'farmer' | 'staff' | 'admin';
  format: 'pdf' | 'csv' | 'excel';
  sections: Array<{
    title: string;
    type: 'table' | 'chart' | 'summary';
    dataSource: string;
    query: string;
    parameters?: Record<string, any>;
  }>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    day?: number;
    time: string;
    timezone: string;
  };
  delivery: Array<{
    method: 'email' | 'download' | 'in_app';
    recipients?: string[];
  }>;
};

// Offline Mode Types
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type OfflineData = {
  version: number;
  lastSync: string;
  collections: Array<{
    id: string;
    farmerId: string;
    quantity: number;
    quality?: Record<string, number>;
    location: Coordinates;
    timestamp: string;
    syncStatus: SyncStatus;
    conflictResolution?: {
      serverTimestamp?: string;
      resolution: 'local' | 'server' | 'merged';
    };
  }>;
  farmers: Array<{
    id: string;
    basicInfo: {
      name: string;
      registrationNumber: string;
      location: Coordinates;
    };
    lastCollection?: {
      date: string;
      quantity: number;
    };
  }>;
  routes: Array<{
    id: string;
    waypoints: RouteWaypoint[];
    offline: boolean;
  }>;
};