export interface NetworkDiagnostics {
  systemStatus: {
    healthy: boolean;
    message: string;
    lastUpdate?: string;
  };
  
  apiHealth: {
    endpoints: {
      name: string;
      status: 'ok' | 'error';
      responseTime: number;
      statusCode: number;
    }[];
    timestamp: string;
  };
  
  databaseStatus: {
    connected: boolean;
    message: string;
    error?: string;
    connectionPool?: {
      active: number;
      idle: number;
      waiting: number;
    };
  };
  
  connections: {
    type: string;
    status: string;
    duration: number;
    ip: string;
    timestamp: string;
  }[];
  
  latencyMetrics: {
    service: string;
    averageResponseTime: number;
    peakResponseTime: number;
    requestCount: number;
    timestamp: string;
  }[];
  
  recentErrors: {
    type: string;
    message: string;
    service: string;
    timestamp: string;
  }[];
  
  timestamp: string;
}