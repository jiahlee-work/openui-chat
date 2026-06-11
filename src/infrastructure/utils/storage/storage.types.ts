export type StorageSetOptions = Readonly<{
  ttlMs?: number;
}>;

export type StoragePayload<T> = Readonly<{
  value: T;
  expiresAt?: number;
}>;

export interface Storage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: StorageSetOptions): void;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

export type StorageType = "local" | "session" | "memory";

export type CreateStorageOptions = Readonly<{
  type?: StorageType;
  prefix?: string;
  fallback?: Storage;
}>;
