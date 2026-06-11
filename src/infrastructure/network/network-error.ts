import type { AppErrorMetadata } from "@shared/errors";

export type NetworkErrorOptions = {
  message?: string;
  cause?: unknown;
  status?: number;
  timeout?: boolean;
  retryable?: boolean;
  metadata?: AppErrorMetadata;
};

export class NetworkError extends Error {
  override readonly cause?: unknown;
  readonly status?: number;
  readonly timeout: boolean;
  readonly retryable?: boolean;
  readonly metadata?: AppErrorMetadata;

  constructor({
    message = "A network error occurred.",
    cause,
    status,
    timeout = false,
    retryable,
    metadata,
  }: NetworkErrorOptions = {}) {
    super(message, cause === undefined ? undefined : { cause });

    this.name = "NetworkError";
    this.cause = cause;
    this.status = status;
    this.timeout = timeout;
    this.retryable = retryable;
    this.metadata = metadata === undefined ? undefined : Object.freeze({ ...metadata });
  }
}
