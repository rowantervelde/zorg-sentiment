/**
 * Logger Utility (T007)
 * Simple structured logging for sentiment service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private prefix: string;

  constructor(prefix: string = 'sentiment-service') {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}] ${message}${contextStr}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage);
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with additional prefix
   */
  child(subPrefix: string): Logger {
    return new Logger(`${this.prefix}:${subPrefix}`);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
