import type {
  Coordinates,
  MapBounds,
  StaffRoute,
  CollectionPoint,
  RouteWaypoint,
  Dashboard,
  ChartConfig,
  ReportTemplate,
  OfflineData,
  SyncStatus
} from '../types/integration.types';

// Map Service Interface
export interface MapService {
  // Map Management
  initializeMap(containerId: string, options?: any): Promise<void>;
  setCenter(coordinates: Coordinates): void;
  setBounds(bounds: MapBounds): void;
  
  // Route Management
  displayRoute(route: StaffRoute): void;
  optimizeRoute(waypoints: RouteWaypoint[]): Promise<StaffRoute>;
  updateRouteStatus(routeId: string, status: StaffRoute['status']): void;
  
  // Location Tracking
  startTracking(staffId: string): void;
  stopTracking(staffId: string): void;
  getLastLocation(staffId: string): Promise<Coordinates>;
  
  // Geofencing
  createGeofence(center: Coordinates, radius: number): void;
  checkGeofence(location: Coordinates): boolean;
  
  // Utilities
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(coordinates: Coordinates): Promise<string>;
  calculateDistance(start: Coordinates, end: Coordinates): number;
}

// Analytics Service Interface
export interface AnalyticsService {
  // Dashboard Management
  initializeDashboard(config: Dashboard): void;
  refreshDashboard(): void;
  
  // Chart Management
  renderChart(config: ChartConfig): void;
  updateChartData(chartId: string, data: any): void;
  exportChart(chartId: string, format: 'png' | 'svg'): Promise<Blob>;
  
  // Data Management
  fetchMetricData(metricId: string, timeRange?: { start: string; end: string }): Promise<any>;
  calculateTrend(metricId: string, periods: number): Promise<number>;
  
  // Utilities
  applyFilters(filters: Record<string, any>): void;
  setTimeRange(start: string, end: string): void;
}

// Report Service Interface
export interface ReportService {
  // Report Generation
  generateReport(template: ReportTemplate, parameters: Record<string, any>): Promise<Blob>;
  scheduleReport(template: ReportTemplate): Promise<void>;
  cancelScheduledReport(reportId: string): Promise<void>;
  
  // Report Management
  getReportHistory(userId: string): Promise<any[]>;
  downloadReport(reportId: string): Promise<Blob>;
  
  // Template Management
  createTemplate(template: ReportTemplate): Promise<string>;
  updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<void>;
  
  // Delivery
  deliverReport(reportId: string, method: 'email' | 'in_app'): Promise<void>;
}

// Offline Service Interface
export interface OfflineService {
  // Data Management
  initializeOfflineStorage(): Promise<void>;
  syncData(): Promise<SyncStatus>;
  
  // Collection Management
  saveOfflineCollection(collection: any): Promise<string>;
  getOfflineCollections(): Promise<any[]>;
  
  // Sync Management
  startAutoSync(interval?: number): void;
  stopAutoSync(): void;
  getSyncStatus(): SyncStatus;
  
  // Conflict Resolution
  resolveConflict(itemId: string, resolution: 'local' | 'server' | 'merged'): Promise<void>;
  getConflicts(): Promise<any[]>;
  
  // Storage Management
  clearOfflineData(): Promise<void>;
  getStorageUsage(): Promise<{ used: number; total: number }>;
}