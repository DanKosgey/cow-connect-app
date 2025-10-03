// Admin Dashboard Analytics interfaces
export interface ChartData {
  date: string;
  count?: number;
  growth_rate?: number;
  volume?: number;
  change?: number;
  avg_quality?: number;
  grade_distribution?: Record<string, number>;
  revenue?: number;
  profit_margin?: number;
  value?: number;
  [key: string]: any;
}

export interface OverviewStats {
  total_farmers: number;
  active_collections: number;
  monthly_revenue: number;
  quality_average: number;
}

export interface RegionalStats {
  region: string;
  farmers: number;
  collections: number;
  revenue: number;
  avg_quality: number;
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  affected_components: string[];
  action_required: boolean;
  timestamp: string;
  acknowledged?: boolean;
}

export interface DashboardAnalytics {
  overview: OverviewStats;
  trends: {
    farmer_growth: ChartData[];
    collection_volume: ChartData[];
    quality_trends: ChartData[];
    revenue_trends: ChartData[];
  };
  regional_breakdown: RegionalStats[];
  system_alerts: SystemAlert[];
}

export interface DashboardData {
  overview: OverviewStats;
  trends: {
    farmer_growth: ChartData[];
    collection_volume: ChartData[];
    quality_trends: ChartData[];
    revenue_trends: ChartData[];
  };
  regional_breakdown: RegionalStats[];
  system_alerts: SystemAlert[];
}