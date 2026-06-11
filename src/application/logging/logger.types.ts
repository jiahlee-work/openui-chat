export type LogMetadata = Readonly<Record<string, unknown>>;

export type LogContext = Readonly<{
  userId?: string;
  sessionId?: string;
  requestId?: string;
  route?: string;
  feature?: string;
  metadata?: LogMetadata;
}>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export type LogContextSanitizer = (context: LogContext) => unknown;
