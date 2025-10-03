type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private isProduction = process.env.NODE_ENV === 'production';

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            data,
        };
    }

    private log(entry: LogEntry): void {
        const { level, message, timestamp, data } = entry;
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        switch (level) {
            case 'debug':
                if (!this.isProduction) {
                    console.debug(formattedMessage, data || '');
                }
                break;
            case 'info':
                console.info(formattedMessage, data || '');
                break;
            case 'warn':
                console.warn(formattedMessage, data || '');
                break;
            case 'error':
                console.error(formattedMessage, data || '');
                break;
        }
    }

    debug(message: string, data?: any): void {
        this.log(this.formatMessage('debug', message, data));
    }

    info(message: string, data?: any): void {
        this.log(this.formatMessage('info', message, data));
    }

    warn(message: string, data?: any): void {
        this.log(this.formatMessage('warn', message, data));
    }

    error(message: string, data?: any): void {
        this.log(this.formatMessage('error', message, data));
    }

    // Performance logging
    time(label: string): void {
        if (!this.isProduction) {
            console.time(label);
        }
    }

    timeEnd(label: string): void {
        if (!this.isProduction) {
            console.timeEnd(label);
        }
    }
}

export const logger = Logger.getInstance();
