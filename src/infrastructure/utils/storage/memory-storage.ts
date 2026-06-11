import type { Storage, StoragePayload, StorageSetOptions } from "./storage.types";

export type MemoryStorageOptions = Readonly<{
  prefix?: string;
}>;

type MemoryEntry<T> = StoragePayload<T>;

export class MemoryStorage implements Storage {
  private readonly entries = new Map<string, MemoryEntry<unknown>>();
  private readonly prefix: string;

  constructor(options: MemoryStorageOptions = {}) {
    this.prefix = options.prefix ?? "";
  }

  get<T>(key: string): T | null {
    const entry = this.getActiveEntry<T>(key);
    return entry?.value ?? null;
  }

  set<T>(key: string, value: T, options: StorageSetOptions = {}): void {
    this.entries.set(this.createKey(key), {
      value,
      expiresAt: createExpiresAt(options.ttlMs),
    });
  }

  remove(key: string): void {
    this.entries.delete(this.createKey(key));
  }

  clear(): void {
    this.entries.clear();
  }

  has(key: string): boolean {
    return this.getActiveEntry(key) !== undefined;
  }

  private createKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private getActiveEntry<T>(key: string): MemoryEntry<T> | undefined {
    const storageKey = this.createKey(key);
    const entry = this.entries.get(storageKey) as MemoryEntry<T> | undefined;

    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(storageKey);
      return undefined;
    }

    return entry;
  }
}

function createExpiresAt(ttlMs: number | undefined): number | undefined {
  if (ttlMs === undefined || !Number.isFinite(ttlMs)) {
    return undefined;
  }

  return Date.now() + Math.max(0, ttlMs);
}
