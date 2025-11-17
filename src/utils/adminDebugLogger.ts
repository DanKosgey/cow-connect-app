// Utility for detailed admin portal debugging
export class AdminDebugLogger {
  private static isEnabled = true;
  private static logCounter = 0;
  
  static enable() {
    this.isEnabled = true;
    console.log('🔍 [ADMIN DEBUG] Debug logging enabled');
  }
  
  static disable() {
    this.isEnabled = false;
    console.log('🔍 [ADMIN DEBUG] Debug logging disabled');
  }
  
  private static getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }
  
  private static getLogPrefix(type: string): string {
    this.logCounter++;
    return `[${this.getTimestamp()}] ${type} [ADMIN DEBUG #${this.logCounter}]`;
  }
  
  static log(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🔍')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static error(message: string, error?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('❌')} ${message}`;
      if (error !== undefined) {
        console.error(logMessage, error);
      } else {
        console.error(logMessage);
      }
    }
  }
  
  static warn(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('⚠️')} ${message}`;
      if (data !== undefined) {
        console.warn(logMessage, data);
      } else {
        console.warn(logMessage);
      }
    }
  }
  
  static success(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('✅')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static trace(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('📍')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static database(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🗄️')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static network(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🌐')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static auth(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🔐')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static component(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🧩')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static route(message: string, data?: any) {
    if (this.isEnabled) {
      const logMessage = `${this.getLogPrefix('🛣️')} ${message}`;
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
  
  static resetCounter() {
    this.logCounter = 0;
    console.log('🔍 [ADMIN DEBUG] Log counter reset');
  }
}

// Enable debug logging by default in development
if (import.meta.env.DEV) {
  AdminDebugLogger.enable();
}

export default AdminDebugLogger;