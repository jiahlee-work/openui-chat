import { ERROR_CODE, type ErrorCode } from "./error-code";

export type AppErrorMetadata = Readonly<Record<string, unknown>>;

export type AppErrorOptions = {
  code?: ErrorCode;
  message: string;
  cause?: unknown;
  status?: number;
  retryable?: boolean;
  metadata?: AppErrorMetadata;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  override readonly cause?: unknown;
  readonly status?: number;
  readonly retryable: boolean;
  readonly metadata?: AppErrorMetadata;

  constructor({
    code = ERROR_CODE.UNKNOWN,
    message,
    cause,
    status,
    retryable = false,
    metadata,
  }: AppErrorOptions) {
    super(message, cause === undefined ? undefined : { cause });

    this.name = "AppError";
    this.code = code;
    this.cause = cause;
    this.status = status;
    this.retryable = retryable;
    this.metadata = metadata === undefined ? undefined : Object.freeze({ ...metadata });
  }
}
