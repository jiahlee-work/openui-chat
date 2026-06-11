const APP_ENVS = ["local", "development", "staging", "production"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

export type PublicEnv = Readonly<{
  NEXT_PUBLIC_APP_ENV: AppEnv;
  NEXT_PUBLIC_API_BASE_URL: string | undefined;
}>;

export type ServerEnv = Readonly<Record<string, never>>;

type PublicEnvInput = {
  NEXT_PUBLIC_APP_ENV?: string;
  NEXT_PUBLIC_API_BASE_URL?: string;
};

function isAppEnv(value: string): value is AppEnv {
  return APP_ENVS.some((appEnv) => appEnv === value);
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function readPublicEnvInput(): PublicEnvInput {
  // NEXT_PUBLIC_* values can be bundled into client code and must never contain secrets.
  return {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  };
}

export function validateEnv(input: PublicEnvInput = readPublicEnvInput()): PublicEnv {
  const appEnvValue = normalizeOptionalValue(input.NEXT_PUBLIC_APP_ENV) ?? "local";

  if (!isAppEnv(appEnvValue)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_APP_ENV "${appEnvValue}". Expected one of: ${APP_ENVS.join(", ")}.`,
    );
  }

  return Object.freeze({
    NEXT_PUBLIC_APP_ENV: appEnvValue,
    NEXT_PUBLIC_API_BASE_URL: normalizeOptionalValue(input.NEXT_PUBLIC_API_BASE_URL),
  });
}

const PUBLIC_ENV = validateEnv();
const SERVER_ENV: ServerEnv = Object.freeze({});

export const APP_ENV: AppEnv = PUBLIC_ENV.NEXT_PUBLIC_APP_ENV;

export function getPublicEnv(): PublicEnv {
  return PUBLIC_ENV;
}

/**
 * Server-only configuration boundary. Use this function only from server-only code.
 * No server environment variables are required yet.
 */
export function getServerEnv(): ServerEnv {
  return SERVER_ENV;
}

export function isLocalEnv(): boolean {
  return APP_ENV === "local";
}

export function isDevelopmentEnv(): boolean {
  return APP_ENV === "development";
}

export function isStagingEnv(): boolean {
  return APP_ENV === "staging";
}

export function isProductionEnv(): boolean {
  return APP_ENV === "production";
}

export function isProductionLikeEnv(): boolean {
  return isStagingEnv() || isProductionEnv();
}
