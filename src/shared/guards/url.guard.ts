export type SafeRedirectOptions = Readonly<{
  allowedOrigins?: readonly string[];
  allowRelative?: boolean;
  allowSameOrigin?: boolean;
  origin?: string;
}>;

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

function normalizeHttpOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function hasUnsafeUrlCharacters(value: string): boolean {
  return (
    value.includes("\\") ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
    })
  );
}

export function isAbsoluteUrl(value: string): boolean {
  const normalizedValue = value.trim();
  return ABSOLUTE_URL_PATTERN.test(normalizedValue) || normalizedValue.startsWith("//");
}

export function isRelativeUrl(value: string): boolean {
  const normalizedValue = value.trim();

  return (
    normalizedValue.length > 0 &&
    !hasUnsafeUrlCharacters(normalizedValue) &&
    !isAbsoluteUrl(normalizedValue)
  );
}

export function isHttpUrl(value: string): boolean {
  return normalizeHttpOrigin(value.trim()) !== undefined;
}

export function isSafeRedirectUrl(value: string, options: SafeRedirectOptions = {}): boolean {
  const normalizedValue = value.trim();

  if (isRelativeUrl(normalizedValue)) {
    return options.allowRelative ?? true;
  }

  if (!isHttpUrl(normalizedValue)) {
    return false;
  }

  const targetOrigin = normalizeHttpOrigin(normalizedValue);
  if (targetOrigin === undefined) {
    return false;
  }

  const allowedOrigins = new Set(
    options.allowedOrigins
      ?.map(normalizeHttpOrigin)
      .filter((origin): origin is string => origin !== undefined) ?? [],
  );

  if (allowedOrigins.has(targetOrigin)) {
    return true;
  }

  if (options.allowSameOrigin ?? true) {
    const currentOrigin =
      options.origin === undefined ? undefined : normalizeHttpOrigin(options.origin);
    return currentOrigin !== undefined && currentOrigin === targetOrigin;
  }

  return false;
}
