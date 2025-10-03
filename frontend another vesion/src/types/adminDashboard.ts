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

// Updated interface to include growth percentages
export interface AdminDashboardData {
  farmer_stats: {
    total: number;
    active: number;
    pending_kyc: number;
    new_this_month: number;
    growth_percentage: number;
    active_growth_percentage: number;
  };
  collection_stats: {
    today: number;
    today_liters: number;
    week_liters: number;
    month_liters: number;
    avg_daily_collection: number;
    today_growth_percentage: number;
    week_growth_percentage: number;
    month_growth_percentage: number;
  };
  payment_stats: {
    total_revenue: number;
    pending_payments: number;
    processed_today: number;
  };
  quality_metrics: {
    avg_quality: number;
    grade_distribution: Record<string, number>;
    best_collection_day: string;
  };
  system_health: {
    uptime: number;
    active_users: number;
    pending_alerts: number;
  };
  last_updated: string;
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