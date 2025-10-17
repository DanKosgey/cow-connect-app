// Logging configuration
export const LOGGING_CONFIG = {
  // Enable/disable different types of logging
  ENABLE_DEBUG_LOGS: true,
  ENABLE_INFO_LOGS: true,
  ENABLE_WARN_LOGS: true,
  ENABLE_ERROR_LOGS: true,
  
  // Control logging for specific modules
  MODULE_LOGGING: {
    'CollectionsView': true,
    'useRealtimeCollections': true,
    'CollectionsAnalyticsDashboard': true,
    'PaymentSystem': true,
    'FarmerPortal': true
  },
  
  // Log levels
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
};

// Enhanced logging utility
export class Logger {
  private static instance: Logger;
  private config = LOGGING_CONFIG;
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private shouldLog(module: string, level: number): boolean {
    // Check if logging is enabled for this level
    switch (level) {
      case this.config.LEVELS.DEBUG:
        if (!this.config.ENABLE_DEBUG_LOGS) return false;
        break;
      case this.config.LEVELS.INFO:
        if (!this.config.ENABLE_INFO_LOGS) return false;
        break;
      case this.config.LEVELS.WARN:
        if (!this.config.ENABLE_WARN_LOGS) return false;
        break;
      case this.config.LEVELS.ERROR:
        if (!this.config.ENABLE_ERROR_LOGS) return false;
        break;
    }
    
    // Check if logging is enabled for this module
    return this.config.MODULE_LOGGING[module] !== false;
  }
  
  debug(module: string, message: string, data?: any) {
    if (this.shouldLog(module, this.config.LEVELS.DEBUG)) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG] [${module}] ${timestamp} - ${message}`, data || '');
    }
  }
  
  info(module: string, message: string, data?: any) {
    if (this.shouldLog(module, this.config.LEVELS.INFO)) {
      const timestamp = new Date().toISOString();
      console.log(`[INFO] [${module}] ${timestamp} - ${message}`, data || '');
    }
  }
  
  warn(module: string, message: string, data?: any) {
    if (this.shouldLog(module, this.config.LEVELS.WARN)) {
      const timestamp = new Date().toISOString();
      console.warn(`[WARN] [${module}] ${timestamp} - ${message}`, data || '');
    }
  }
  
  error(module: string, message: string, data?: any) {
    if (this.shouldLog(module, this.config.LEVELS.ERROR)) {
      const timestamp = new Date().toISOString();
      console.error(`[ERROR] [${module}] ${timestamp} - ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for specific modules
export const collectionsViewLogger = {
  debug: (message: string, data?: any) => logger.debug('CollectionsView', message, data),
  info: (message: string, data?: any) => logger.info('CollectionsView', message, data),
  warn: (message: string, data?: any) => logger.warn('CollectionsView', message, data),
  error: (message: string, data?: any) => logger.error('CollectionsView', message, data)
};

export const realtimeCollectionsLogger = {
  debug: (message: string, data?: any) => logger.debug('useRealtimeCollections', message, data),
  info: (message: string, data?: any) => logger.info('useRealtimeCollections', message, data),
  warn: (message: string, data?: any) => logger.warn('useRealtimeCollections', message, data),
  error: (message: string, data?: any) => logger.error('useRealtimeCollections', message, data)
};