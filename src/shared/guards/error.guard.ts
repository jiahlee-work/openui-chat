import { AppError } from "@shared/errors";

type AbortErrorLike = {
  readonly name: "AbortError";
};

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function hasErrorMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
}

export function isAbortError(value: unknown): value is AbortErrorLike {
  if (
    typeof DOMException !== "undefined" &&
    value instanceof DOMException &&
    value.name === "AbortError"
  ) {
    return true;
  }

  return (
    typeof value === "object" && value !== null && "name" in value && value.name === "AbortError"
  );
}
