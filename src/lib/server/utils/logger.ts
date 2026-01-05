import { LogLevel } from "./log-level";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, metadata, error } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      formatted += ` | Metadata: ${JSON.stringify(metadata)}`;
    }

    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack && this.isDevelopment) {
        formatted += `\n${error.stack}`;
      }
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
      error,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case LogLevel.Error:
        console.error(formatted);
        if (this.isProduction && error) {
        }
        break;
      case LogLevel.Warn:
        console.warn(formatted);
        break;
      case LogLevel.Info:
        if (this.isDevelopment) {
          console.info(formatted);
        }
        break;
      case LogLevel.Debug:
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.Info, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.Warn, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.Error, message, metadata, error);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.Debug, message, metadata);
  }
}

export const logger = new Logger();

