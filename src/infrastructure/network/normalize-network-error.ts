import { NetworkError } from "@infrastructure/network/network-error";
import { AppError, ERROR_CODE, type ErrorCode } from "@shared/errors";
import { hasErrorMessage, isAbortError, isAppError } from "@shared/guards";

type ErrorClassification = {
  code: ErrorCode;
  retryable: boolean;
  fallbackMessage: string;
};

function getHttpStatus(value: unknown): number | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("status" in value) ||
    typeof value.status !== "number" ||
    !Number.isInteger(value.status) ||
    value.status < 100 ||
    value.status > 599
  ) {
    return undefined;
  }

  return value.status;
}

function hasErrorName(value: unknown, name: string): boolean {
  return typeof value === "object" && value !== null && "name" in value && value.name === name;
}

function hasErrorCode(value: unknown, code: string): boolean {
  return typeof value === "object" && value !== null && "code" in value && value.code === code;
}

function isTimeoutError(value: unknown): boolean {
  return (
    (value instanceof NetworkError && value.timeout) ||
    hasErrorName(value, "TimeoutError") ||
    hasErrorCode(value, "ETIMEDOUT")
  );
}

function classifyHttpStatus(status: number): ErrorClassification | undefined {
  if (status === 401) {
    return {
      code: ERROR_CODE.UNAUTHORIZED,
      retryable: false,
      fallbackMessage: "The request is unauthorized.",
    };
  }

  if (status === 403) {
    return {
      code: ERROR_CODE.FORBIDDEN,
      retryable: false,
      fallbackMessage: "The request is forbidden.",
    };
  }

  if (status === 404) {
    return {
      code: ERROR_CODE.NOT_FOUND,
      retryable: false,
      fallbackMessage: "The requested resource was not found.",
    };
  }

  if (status === 408) {
    return {
      code: ERROR_CODE.TIMEOUT,
      retryable: true,
      fallbackMessage: "The request timed out.",
    };
  }

  if (status >= 400 && status < 500) {
    return {
      code: ERROR_CODE.VALIDATION,
      retryable: false,
      fallbackMessage: "The request is invalid.",
    };
  }

  if (status >= 500) {
    return {
      code: ERROR_CODE.SERVER,
      retryable: true,
      fallbackMessage: "The server could not complete the request.",
    };
  }

  return undefined;
}

function getMessage(value: unknown, fallbackMessage: string): string {
  if (!hasErrorMessage(value)) {
    return fallbackMessage;
  }

  const message = value.message.trim();
  return message || fallbackMessage;
}

function createAppError(
  value: unknown,
  classification: ErrorClassification,
  status?: number,
): AppError {
  const networkError = value instanceof NetworkError ? value : undefined;

  return new AppError({
    code: classification.code,
    message: getMessage(value, classification.fallbackMessage),
    cause: value,
    status,
    retryable: networkError?.retryable ?? classification.retryable,
    metadata: networkError?.metadata,
  });
}

export function normalizeNetworkError(value: unknown): AppError {
  if (isAppError(value)) {
    return value;
  }

  if (isAbortError(value)) {
    return createAppError(value, {
      code: ERROR_CODE.NETWORK,
      retryable: false,
      fallbackMessage: "The operation was aborted.",
    });
  }

  if (isTimeoutError(value)) {
    return createAppError(value, {
      code: ERROR_CODE.TIMEOUT,
      retryable: true,
      fallbackMessage: "The request timed out.",
    });
  }

  const status = getHttpStatus(value);
  if (status !== undefined) {
    const classification = classifyHttpStatus(status);
    if (classification !== undefined) {
      return createAppError(value, classification, status);
    }
  }

  if (value instanceof NetworkError) {
    return createAppError(
      value,
      {
        code: ERROR_CODE.NETWORK,
        retryable: true,
        fallbackMessage: "A network error occurred.",
      },
      status,
    );
  }

  return createAppError(value, {
    code: ERROR_CODE.UNKNOWN,
    retryable: false,
    fallbackMessage: "An unknown error occurred.",
  });
}
