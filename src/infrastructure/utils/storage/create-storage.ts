import { BrowserStorage } from "./browser-storage";
import { MemoryStorage } from "./memory-storage";
import type { CreateStorageOptions, Storage } from "./storage.types";

export function createStorage(options: CreateStorageOptions = {}): Storage {
  const type = options.type ?? "local";

  if (type === "memory") {
    return new MemoryStorage({ prefix: options.prefix });
  }

  return new BrowserStorage({
    type,
    prefix: options.prefix,
    fallback: options.fallback,
  });
}
