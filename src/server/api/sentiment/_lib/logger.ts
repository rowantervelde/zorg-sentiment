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
    
    // Send critical errors to alert webhook (T050)
    this.sendAlertIfCritical(message, context);
  }

  /**
   * Send critical alerts to monitoring webhook (T050, FR-020)
   */
  private async sendAlertIfCritical(message: string, context?: LogContext): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return; // No webhook configured
    }
    
    // Determine if this is a critical alert
    const isCritical = this.isCriticalAlert(message, context);
    
    if (!isCritical) {
      return;
    }
    
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        service: 'sentiment-snapshot',
        severity: 'critical',
        message,
        context,
        environment: process.env.NODE_ENV || 'production',
      };
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Don't throw - logging failures shouldn't break the app
      console.error('[ALERT] Failed to send webhook', err);
    }
  }
  
  /**
   * Determine if a log should trigger a critical alert (FR-020)
   */
  private isCriticalAlert(message: string, context?: LogContext): boolean {
    // Critical condition 1: All sources down for >5 minutes
    if (message.includes('All data sources unavailable')) {
      return true;
    }
    
    // Critical condition 2: Data staleness >60 minutes
    if (context && typeof context.staleness_minutes === 'number' && context.staleness_minutes > 60) {
      return true;
    }
    
    // Critical condition 3: Multiple rate limit violations
    if (message.includes('Rate limit') && context && context.source_count === 0) {
      return true;
    }
    
    // Critical condition 4: API response time >10 seconds
    if (context && typeof context.duration_ms === 'number' && context.duration_ms > 10000) {
      return true;
    }
    
    return false;
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
