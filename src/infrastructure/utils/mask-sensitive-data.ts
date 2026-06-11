import { redactString } from "@shared/utils";

const DEFAULT_SENSITIVE_KEYS = [
  "authorization",
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "secret",
  "apiKey",
] as const;

const CIRCULAR_VALUE = "[Circular]";

export type MaskSensitiveDataOptions = Readonly<{
  mask?: string;
  sensitiveKeys?: readonly string[];
  maskEmails?: boolean;
}>;

function normalizeKey(value: string): string {
  return value.replace(/[^a-z\d]/gi, "").toLowerCase();
}

function createSensitiveKeySet(keys: readonly string[] | undefined): ReadonlySet<string> {
  return new Set([...DEFAULT_SENSITIVE_KEYS, ...(keys ?? [])].map(normalizeKey));
}

function maskEmailAddress(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (emailAddress) => {
    const separatorIndex = emailAddress.lastIndexOf("@");
    const localPart = emailAddress.slice(0, separatorIndex);
    const domain = emailAddress.slice(separatorIndex);

    return `${redactString(localPart, { visibleStart: 1 })}${domain}`;
  });
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function maskSensitiveData(value: unknown, options: MaskSensitiveDataOptions = {}): unknown {
  const mask = options.mask ?? "[REDACTED]";
  const sensitiveKeys = createSensitiveKeySet(options.sensitiveKeys);
  const ancestors = new WeakSet<object>();

  function maskValue(currentValue: unknown, key?: string): unknown {
    if (key !== undefined && sensitiveKeys.has(normalizeKey(key))) {
      return mask;
    }

    if (typeof currentValue === "string") {
      return options.maskEmails ? maskEmailAddress(currentValue) : currentValue;
    }

    if (typeof currentValue !== "object" || currentValue === null) {
      return currentValue;
    }

    if (currentValue instanceof Date || currentValue instanceof Error) {
      return currentValue;
    }

    if (ancestors.has(currentValue)) {
      return CIRCULAR_VALUE;
    }

    if (!Array.isArray(currentValue) && !isPlainObject(currentValue)) {
      return currentValue;
    }

    ancestors.add(currentValue);

    const maskedValue = Array.isArray(currentValue)
      ? currentValue.map((item) => maskValue(item))
      : Object.fromEntries(
          Object.entries(currentValue).map(([entryKey, entryValue]) => [
            entryKey,
            maskValue(entryValue, entryKey),
          ]),
        );

    ancestors.delete(currentValue);
    return maskedValue;
  }

  return maskValue(value);
}
