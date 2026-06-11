import { LOG_LEVEL, type LogLevel } from "./log-level";
import type { LogContext, LogContextSanitizer, Logger } from "./logger.types";

export type ConsoleLoggerOptions = Readonly<{
  suppressDebugAndInfo?: boolean;
  sanitizeContext?: LogContextSanitizer;
}>;

function writeToConsole(level: LogLevel, message: string, context?: unknown): void {
  const args = context === undefined ? [message] : [message, context];

  switch (level) {
    case LOG_LEVEL.DEBUG:
      // biome-ignore lint/suspicious/noConsole: ConsoleLogger intentionally writes to the runtime console.
      console.debug(...args);
      break;
    case LOG_LEVEL.INFO:
      // biome-ignore lint/suspicious/noConsole: ConsoleLogger intentionally writes to the runtime console.
      console.info(...args);
      break;
    case LOG_LEVEL.WARN:
      // biome-ignore lint/suspicious/noConsole: ConsoleLogger intentionally writes to the runtime console.
      console.warn(...args);
      break;
    case LOG_LEVEL.ERROR:
      // biome-ignore lint/suspicious/noConsole: ConsoleLogger intentionally writes to the runtime console.
      console.error(...args);
      break;
  }
}

export class ConsoleLogger implements Logger {
  private readonly suppressDebugAndInfo: boolean;
  private readonly sanitizeContext?: (context: LogContext) => unknown;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.suppressDebugAndInfo = options.suppressDebugAndInfo ?? false;
    this.sanitizeContext = options.sanitizeContext;
  }

  debug(message: string, context?: LogContext): void {
    this.write(LOG_LEVEL.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write(LOG_LEVEL.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write(LOG_LEVEL.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write(LOG_LEVEL.ERROR, message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (this.suppressDebugAndInfo && (level === LOG_LEVEL.DEBUG || level === LOG_LEVEL.INFO)) {
      return;
    }

    writeToConsole(
      level,
      message,
      context === undefined ? undefined : (this.sanitizeContext?.(context) ?? context),
    );
  }
}
