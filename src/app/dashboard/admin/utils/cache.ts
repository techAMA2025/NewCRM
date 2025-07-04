/*
  Lightweight in-memory cache for the admin dashboard layer.  
  NOTE: This runs only on the client side (browser memory).
*/

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>();
  constructor(private defaultTtlMs = 5 * 60 * 1000) {} // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs) {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

// Separate cache instances for different data groups
export const adminCache = new SimpleCache(5 * 60 * 1000);  // 5 m
export const adminAnalyticsCache = new SimpleCache(10 * 60 * 1000); // 10 m
export const adminUsersCache = new SimpleCache(15 * 60 * 1000); // 15 m

// Helper functions to keep cache-key generation consistent
export const generateCacheKey = {
  users: () => `admin-users-${new Date().toDateString()}`,
  targets: (month: string, year: number) => `admin-targets-${month}-${year}`,
  leads: () => `admin-leads-${new Date().toDateString()}`,
  pendingLetters: () => `admin-pending-letters-${new Date().toDateString()}`,
  stats: () => `admin-stats-${new Date().toDateString()}`,
  salesUsers: () => `admin-sales-users-${new Date().toDateString()}`,
}; 