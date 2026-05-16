type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCachedPageData<T>(key: string): T | null {
  const now = Date.now();
  const inMemory = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (inMemory && inMemory.expiresAt > now) {
    return inMemory.value;
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`page_cache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now) {
      sessionStorage.removeItem(`page_cache:${key}`);
      return null;
    }
    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedPageData<T>(key: string, value: T, ttlMs = 30000): void {
  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  memoryCache.set(key, entry as CacheEntry<unknown>);

  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`page_cache:${key}`, JSON.stringify(entry));
  } catch {
    // ignore storage failures
  }
}
