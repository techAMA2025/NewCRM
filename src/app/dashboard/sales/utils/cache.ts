// Cache utility for Sales Dashboard
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SalesCache {
  private cache = new Map<string, CacheItem<any>>();
  protected defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create specialized cache instances with different TTLs
class AnalyticsCache extends SalesCache {
  constructor() {
    super();
    this.defaultTTL = 10 * 60 * 1000; // 10 minutes for analytics
  }
}

class TargetsCache extends SalesCache {
  constructor() {
    super();
    this.defaultTTL = 15 * 60 * 1000; // 15 minutes for targets
  }
}

class TasksCache extends SalesCache {
  constructor() {
    super();
    this.defaultTTL = 3 * 60 * 1000; // 3 minutes for tasks
  }
}

// Create cache instances with different TTLs
export const salesCache = new SalesCache();
export const salesAnalyticsCache = new AnalyticsCache();
export const salesTargetsCache = new TargetsCache();
export const salesTasksCache = new TasksCache();

// Cache key generators
export const generateCacheKey = {
  targets: (userName: string, month: string, year: number) => 
    `sales_targets_${userName}_${month}_${year}`,
  
  leads: (userName: string, month: string, year: number) => 
    `sales_leads_${userName}_${month}_${year}`,
  
  billcutLeads: (userName: string, month: string, year: number) => 
    `sales_billcut_leads_${userName}_${month}_${year}`,
  
  tasks: (userName: string) => 
    `sales_tasks_${userName}`,
  
  availableMonths: (userName: string) => 
    `sales_available_months_${userName}`,
  
  analytics: (userName: string, month: string, year: number, source: 'AMA' | 'Billcut') => 
    `sales_analytics_${userName}_${month}_${year}_${source}`
};

// Auto-cleanup expired cache items every 10 minutes
setInterval(() => {
  salesCache.cleanup();
  salesAnalyticsCache.cleanup();
  salesTargetsCache.cleanup();
  salesTasksCache.cleanup();
}, 10 * 60 * 1000); 