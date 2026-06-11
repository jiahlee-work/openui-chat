import { MemoryStorage } from "./memory-storage";
import type { Storage, StoragePayload, StorageSetOptions, StorageType } from "./storage.types";

type BrowserStorageType = Exclude<StorageType, "memory">;

export type BrowserStorageOptions = Readonly<{
  type: BrowserStorageType;
  prefix?: string;
  fallback?: Storage;
}>;

type BrowserStorageArea = Pick<
  globalThis.Storage,
  "clear" | "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

type ReadResult<T> =
  | Readonly<{ status: "found"; value: T }>
  | Readonly<{ status: "missing" | "discarded" | "unavailable" }>;

export class BrowserStorage implements Storage {
  private readonly type: BrowserStorageType;
  private readonly prefix: string;
  private readonly fallback: Storage;
  private readonly fallbackKeys = new Set<string>();

  constructor(options: BrowserStorageOptions) {
    this.type = options.type;
    this.prefix = options.prefix ?? "";
    this.fallback = options.fallback ?? new MemoryStorage({ prefix: this.prefix });
  }

  get<T>(key: string): T | null {
    const result = this.read<T>(key);

    if (result.status === "found") {
      return result.value;
    }

    if (result.status === "unavailable") {
      return this.fallback.get<T>(key);
    }

    if (result.status === "missing" && this.fallbackKeys.has(key)) {
      return this.fallback.get<T>(key);
    }

    if (result.status === "discarded") {
      this.fallback.remove(key);
      this.fallbackKeys.delete(key);
    }

    return null;
  }

  set<T>(key: string, value: T, options: StorageSetOptions = {}): void {
    const payload: StoragePayload<T> = {
      value,
      expiresAt: createExpiresAt(options.ttlMs),
    };
    const serializedPayload = serializePayload(payload);

    if (serializedPayload === null) {
      return;
    }

    const storage = this.getStorage();
    if (storage === null) {
      this.fallback.set(key, value, options);
      this.fallbackKeys.add(key);
      return;
    }

    try {
      storage.setItem(this.createKey(key), serializedPayload);
      this.fallback.remove(key);
      this.fallbackKeys.delete(key);
    } catch {
      this.fallback.set(key, value, options);
      this.fallbackKeys.add(key);
    }
  }

  remove(key: string): void {
    const storage = this.getStorage();

    if (storage !== null) {
      try {
        storage.removeItem(this.createKey(key));
      } catch {
        // The fallback is still cleared below.
      }
    }

    this.fallback.remove(key);
    this.fallbackKeys.delete(key);
  }

  clear(): void {
    const storage = this.getStorage();

    if (storage !== null) {
      try {
        if (this.prefix.length === 0) {
          storage.clear();
        } else {
          this.clearPrefixedEntries(storage);
        }
      } catch {
        // The fallback is still cleared below.
      }
    }

    this.fallback.clear();
    this.fallbackKeys.clear();
  }

  has(key: string): boolean {
    const result = this.read(key);

    if (result.status === "found") {
      return true;
    }

    if (result.status === "unavailable") {
      return this.fallback.has(key);
    }

    if (result.status === "missing" && this.fallbackKeys.has(key)) {
      return this.fallback.has(key);
    }

    if (result.status === "discarded") {
      this.fallback.remove(key);
      this.fallbackKeys.delete(key);
    }

    return false;
  }

  private createKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private getStorage(): BrowserStorageArea | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return this.type === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  private read<T>(key: string): ReadResult<T> {
    const storage = this.getStorage();
    if (storage === null) {
      return { status: "unavailable" };
    }

    const storageKey = this.createKey(key);

    let serializedPayload: string | null;

    try {
      serializedPayload = storage.getItem(storageKey);
    } catch {
      return { status: "unavailable" };
    }

    if (serializedPayload === null) {
      return { status: "missing" };
    }

    const payload = parsePayload<T>(serializedPayload);
    if (payload === null) {
      removeItemSafely(storage, storageKey);
      return { status: "discarded" };
    }

    if (payload.expiresAt !== undefined && payload.expiresAt <= Date.now()) {
      removeItemSafely(storage, storageKey);
      return { status: "discarded" };
    }

    return { status: "found", value: payload.value };
  }

  private clearPrefixedEntries(storage: BrowserStorageArea): void {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  }
}

function createExpiresAt(ttlMs: number | undefined): number | undefined {
  if (ttlMs === undefined || !Number.isFinite(ttlMs)) {
    return undefined;
  }

  return Date.now() + Math.max(0, ttlMs);
}

function isStoragePayload<T>(value: unknown): value is StoragePayload<T> {
  if (typeof value !== "object" || value === null || !Object.hasOwn(value, "value")) {
    return false;
  }

  const expiresAt = Reflect.get(value, "expiresAt");
  return expiresAt === undefined || (typeof expiresAt === "number" && Number.isFinite(expiresAt));
}

function parsePayload<T>(value: string): StoragePayload<T> | null {
  try {
    const payload: unknown = JSON.parse(value);
    return isStoragePayload<T>(payload) ? payload : null;
  } catch {
    return null;
  }
}

function serializePayload<T>(payload: StoragePayload<T>): string | null {
  try {
    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === undefined) {
      return null;
    }

    return parsePayload<T>(serializedPayload) === null ? null : serializedPayload;
  } catch {
    return null;
  }
}

function removeItemSafely(storage: BrowserStorageArea, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Expired or malformed values still read as missing when cleanup is unavailable.
  }
}
