export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function hasErrorMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
}
