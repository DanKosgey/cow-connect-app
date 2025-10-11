// Logger utility for the dairy application

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;
  private appName: string = 'Dairy Farmers of Trans Nzoia';

  private constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.level = LogLevel.DEBUG;
    } else if (process.env.NODE_ENV === 'production') {
      this.level = LogLevel.WARN;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setAppName(name: string): void {
    this.appName = name;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${this.appName}] ${timestamp} ${level}: ${message}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message), ...args);
    }
  }

  // Log an error with additional context
  errorWithContext(context: string, error: any, additionalInfo?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.group(`[${this.appName}] ERROR in ${context}`);
      console.error('Message:', errorMessage);
      
      if (additionalInfo) {
        console.log('Additional Info:', additionalInfo);
      }
      
      if (errorStack) {
        console.log('Stack Trace:', errorStack);
      }
      
      // Add more detailed error information
      if (error && typeof error === 'object') {
        console.log('Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      }
      
      console.groupEnd();
    }
  }

  // Log a performance metric
  metric(name: string, value: number, unit: string = ''): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[${this.appName}] METRIC: ${name} = ${value}${unit}`);
    }
  }

  // Log an event
  event(name: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const eventData = data ? JSON.stringify(data) : '';
      console.log(`[${this.appName}] EVENT: ${name}${eventData ? ` - ${eventData}` : ''}`);
    }
  }

  // Create a logger with a specific context
  withContext(context: string): ContextLogger {
    return new ContextLogger(this, context);
  }
}

// Context-aware logger
class ContextLogger {
  private logger: Logger;
  private context: string;

  constructor(logger: Logger, context: string) {
    this.logger = logger;
    this.context = context;
  }

  error(message: string, ...args: any[]): void {
    this.logger.error(`[${this.context}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(`[${this.context}] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(`[${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.logger.debug(`[${this.context}] ${message}`, ...args);
  }

  errorWithContext(error: any, additionalInfo?: Record<string, any>): void {
    this.logger.errorWithContext(this.context, error, additionalInfo);
  }
}

// Create a global instance
const logger = Logger.getInstance();

// Export for use
export { logger, Logger, ContextLogger };

// Convenience functions
export const logError = (message: string, ...args: any[]): void => {
  logger.error(message, ...args);
};

export const logWarn = (message: string, ...args: any[]): void => {
  logger.warn(message, ...args);
};

export const logInfo = (message: string, ...args: any[]): void => {
  logger.info(message, ...args);
};

export const logDebug = (message: string, ...args: any[]): void => {
  logger.debug(message, ...args);
};

export const logErrorWithContext = (
  context: string, 
  error: any, 
  additionalInfo?: Record<string, any>
): void => {
  logger.errorWithContext(context, error, additionalInfo);
};

export const logMetric = (name: string, value: number, unit: string = ''): void => {
  logger.metric(name, value, unit);
};

export const logEvent = (name: string, data?: Record<string, any>): void => {
  logger.event(name, data);
};