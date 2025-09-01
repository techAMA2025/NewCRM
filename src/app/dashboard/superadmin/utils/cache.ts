/*
  Lightweight in-memory cache for the dashboard layer.  
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
export const dashboardCache = new SimpleCache(5 * 60 * 1000);  // 5 m
export const analyticsCache = new SimpleCache(10 * 60 * 1000); // 10 m
export const searchCache = new SimpleCache(60 * 1000);         // 1 m

// Helper functions to keep cache-key generation consistent
export const generateCacheKey = {
  salesAnalytics: (m: number | null, y: number | null, s: string | null) =>
    `sales-${m ?? 'all'}-${y ?? 'all'}-${s ?? 'all'}`,
  leadsData: (from: string, to: string, s: string | null, applied: boolean) =>
    `leads-${from || 'none'}-${to || 'none'}-${s ?? 'all'}-${applied}`,
  clientAnalytics: () => `clients-${new Date().toDateString()}`,
  paymentAnalytics: () => `payments-${new Date().toDateString()}`,
  opsPaymentsAnalytics: (m: number | null, y: number | null, s: string | null) =>
    `ops-payments-${m ?? 'all'}-${y ?? 'all'}-${s ?? 'all'}`,
  salespeople: () => `salespeople-${new Date().toDateString()}`,
}; 