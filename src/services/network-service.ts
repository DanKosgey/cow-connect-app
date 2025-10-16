import { supabase } from '@/lib/supabase';
import { NetworkDiagnostics } from '@/types/network';

export class NetworkService {
  private static instance: NetworkService;

  constructor() {
    if (NetworkService.instance) {
      return NetworkService.instance;
    }
    NetworkService.instance = this;
  }

  async runSystemDiagnostics(): Promise<NetworkDiagnostics> {
    try {
      // Check system status
      const systemStatus = await this.checkSystemStatus();
      
      // Check API endpoints
      const apiHealth = await this.checkApiHealth();
      
      // Check database status
      const databaseStatus = await this.checkDatabaseStatus();
      
      // Get active connections
      const connections = await this.getActiveConnections();
      
      // Get latency metrics
      const latencyMetrics = await this.getLatencyMetrics();
      
      // Get recent errors
      const recentErrors = await this.getRecentErrors();

      return {
        systemStatus,
        apiHealth,
        databaseStatus,
        connections,
        latencyMetrics,
        recentErrors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error running system diagnostics:', error);
      throw error;
    }
  }

  private async checkSystemStatus() {
    const { data: healthCheck } = await supabase
      .from('system_health')
      .select('*')
      .single();

    return {
      healthy: healthCheck?.status === 'healthy',
      message: healthCheck?.message || 'System status check completed',
      lastUpdate: healthCheck?.updated_at
    };
  }

  private async checkApiHealth(): Promise<NetworkDiagnostics['apiHealth']> {
    const endpoints = [
      { name: 'Authentication API', url: '/auth/health' },
      { name: 'Farmers API', url: '/farmers/health' },
      { name: 'Payments API', url: '/payments/health' },
      { name: 'Collections API', url: '/collections/health' }
    ];

    const endpointChecks: NetworkDiagnostics['apiHealth']['endpoints'] = await Promise.all(
      endpoints.map(async (endpoint): Promise<NetworkDiagnostics['apiHealth']['endpoints'][number]> => {
        const startTime = performance.now();
        try {
          const response = await fetch(endpoint.url);
          const endTime = performance.now();
          return {
            name: endpoint.name,
            status: response.ok ? 'ok' : 'error',
            responseTime: Math.round(endTime - startTime),
            statusCode: response.status
          };
        } catch (error) {
          return {
            name: endpoint.name,
            status: 'error',
            responseTime: 0,
            statusCode: 500
          };
        }
      })
    );

    return {
      endpoints: endpointChecks,
      timestamp: new Date().toISOString()
    };
  }

  private async checkDatabaseStatus() {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase
        .from('health_checks')
        .select('count')
        .single();
      
      const endTime = performance.now();
      
      if (error) throw error;

      const { data: poolStats } = await supabase
        .from('pg_stat_activity')
        .select('count')
        .group('state');

      return {
        connected: true,
        message: `Database connection successful (${Math.round(endTime - startTime)}ms)`,
        connectionPool: {
          active: poolStats.find(s => s.state === 'active')?.count || 0,
          idle: poolStats.find(s => s.state === 'idle')?.count || 0,
          waiting: poolStats.find(s => s.state === 'waiting')?.count || 0
        }
      };
    } catch (error) {
      return {
        connected: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getActiveConnections() {
    const { data: connections } = await supabase
      .from('active_connections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return connections?.map(conn => ({
      type: conn.connection_type,
      status: conn.status,
      duration: conn.duration,
      ip: conn.ip_address,
      timestamp: conn.created_at
    })) || [];
  }

  private async getLatencyMetrics() {
    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .gt('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    return metrics?.map(metric => ({
      service: metric.service_name,
      averageResponseTime: metric.avg_response_time,
      peakResponseTime: metric.peak_response_time,
      requestCount: metric.request_count,
      timestamp: metric.timestamp
    })) || [];
  }

  private async getRecentErrors() {
    const { data: errors } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return errors?.map(error => ({
      type: error.error_type,
      message: error.error_message,
      service: error.service_name,
      timestamp: error.created_at
    })) || [];
  }
}
