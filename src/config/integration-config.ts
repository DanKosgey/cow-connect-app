import type {
  Coordinates,
  StaffRoute,
  CollectionPoint,
  Dashboard,
  ReportTemplate,
  OfflineData,
  SyncStatus
} from '../types/integration.types';

// Map Service Configuration
export const mapConfig = {
  provider: 'mapbox', // or 'google'
  apiKey: process.env.VITE_MAP_API_KEY,
  defaultCenter: {
    lat: -1.2921, // Default to Kenya
    lng: 36.8219
  },
  defaultZoom: 12,
  clusterRadius: 50,
  trackingInterval: 300, // 5 minutes
  geofenceDefaults: {
    radius: 1000, // meters
    editable: true
  },
  routeColors: {
    planned: '#3b82f6',
    in_progress: '#22c55e',
    completed: '#64748b'
  }
};

// Analytics Dashboard Configurations
export const dashboardConfigs: Record<string, Dashboard> = {
  adminDashboard: {
    id: 'admin_main',
    name: 'System Overview',
    type: 'admin',
    charts: [
      {
        id: 'daily_collections',
        title: 'Daily Collection Volume',
        type: 'line',
        metrics: ['total_volume', 'average_quality'],
        dimensions: ['collection_date', 'route_id'],
        timeRange: {
          start: '{{now-30d}}',
          end: '{{now}}',
          granularity: 'day'
        }
      },
      {
        id: 'farmer_distribution',
        title: 'Farmer Distribution by Region',
        type: 'pie',
        metrics: ['farmer_count'],
        dimensions: ['region']
      },
      {
        id: 'payment_trends',
        title: 'Payment Processing Trends',
        type: 'area',
        metrics: ['total_amount', 'processing_time'],
        dimensions: ['payment_date'],
        timeRange: {
          start: '{{now-7d}}',
          end: '{{now}}',
          granularity: 'hour'
        }
      }
    ],
    refreshInterval: 300000, // 5 minutes
    filters: {
      region: 'all',
      staff_id: 'all'
    }
  },

  staffDashboard: {
    id: 'staff_main',
    name: 'Collection Progress',
    type: 'staff',
    charts: [
      {
        id: 'route_progress',
        title: 'Today\'s Route Progress',
        type: 'bar',
        metrics: ['completed_stops', 'remaining_stops'],
        dimensions: ['hour']
      },
      {
        id: 'collection_efficiency',
        title: 'Collection Efficiency',
        type: 'line',
        metrics: ['time_per_stop', 'volume_per_stop'],
        dimensions: ['date'],
        timeRange: {
          start: '{{now-7d}}',
          end: '{{now}}',
          granularity: 'day'
        }
      }
    ],
    refreshInterval: 60000, // 1 minute
    filters: {
      route_id: 'current'
    }
  }
};

// Report Template Configurations
export const reportTemplates: Record<string, ReportTemplate> = {
  farmerStatement: {
    id: 'farmer_monthly_statement',
    name: 'Monthly Farmer Statement',
    type: 'farmer',
    format: 'pdf',
    sections: [
      {
        title: 'Collection Summary',
        type: 'table',
        dataSource: 'collections',
        query: `
          SELECT 
            date, 
            quantity,
            quality_score,
            rate,
            amount
          FROM collections
          WHERE farmer_id = :farmerId
          AND date BETWEEN :startDate AND :endDate
          ORDER BY date DESC
        `
      },
      {
        title: 'Quality Trends',
        type: 'chart',
        dataSource: 'collections',
        query: `
          SELECT 
            date_trunc('week', date) as week,
            AVG(quality_score) as avg_quality
          FROM collections
          WHERE farmer_id = :farmerId
          AND date BETWEEN :startDate AND :endDate
          GROUP BY week
          ORDER BY week
        `
      }
    ],
    schedule: {
      frequency: 'monthly',
      day: 1,
      time: '02:00',
      timezone: 'Africa/Nairobi'
    },
    delivery: [
      {
        method: 'email'
      },
      {
        method: 'in_app'
      }
    ]
  }
};

// Offline Sync Configuration
export const offlineConfig = {
  syncInterval: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  compressionThreshold: 1024 * 50, // 50KB
  maxOfflineStorage: 1024 * 1024 * 50, // 50MB
  conflictResolution: {
    rules: {
      collections: {
        strategy: 'timestamp',
        fallback: 'server'
      },
      routes: {
        strategy: 'server',
        fallback: 'server'
      }
    }
  },
  requiredData: [
    'assigned_farmers',
    'current_route',
    'collection_templates'
  ]
};

// SQL Views for Analytics
export const analyticViews = {
  daily_collections: `
    CREATE MATERIALIZED VIEW daily_collections AS
    SELECT 
      date_trunc('day', timestamp) as collection_date,
      route_id,
      COUNT(DISTINCT farmer_id) as farmers_visited,
      SUM(quantity) as total_volume,
      AVG(quality_score) as average_quality
    FROM collections
    GROUP BY collection_date, route_id;
  `,
  
  route_efficiency: `
    CREATE MATERIALIZED VIEW route_efficiency AS
    SELECT
      r.id as route_id,
      r.staff_id,
      date_trunc('day', c.timestamp) as collection_date,
      COUNT(c.id) as total_collections,
      SUM(c.quantity) as total_volume,
      AVG(
        EXTRACT(EPOCH FROM (
          lead(c.timestamp) OVER (PARTITION BY r.id, date_trunc('day', c.timestamp) ORDER BY c.timestamp) 
          - c.timestamp
        )) / 60
      ) as avg_time_between_collections
    FROM routes r
    LEFT JOIN collections c ON c.route_id = r.id
    GROUP BY route_id, staff_id, collection_date;
  `
};