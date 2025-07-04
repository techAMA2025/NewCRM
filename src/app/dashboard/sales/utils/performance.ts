// Performance monitoring utility for Sales Dashboard

interface PerformanceMetric {
  startTime: number;
  endTime?: number;
  duration?: number;
  label: string;
}

class SalesPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private readonly maxMetrics = 100;

  start(label: string): void {
    if (this.metrics.size >= this.maxMetrics) {
      // Clear old metrics if we have too many
      const oldestKey = this.metrics.keys().next().value;
      if (oldestKey) {
        this.metrics.delete(oldestKey);
      }
    }

    this.metrics.set(label, {
      startTime: performance.now(),
      label
    });
  }

  end(label: string): number | null {
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`Performance metric "${label}" not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;



    return metric.duration;
  }

  safeEnd(label: string): void {
    try {
      this.end(label);
    } catch (error) {
      console.warn(`Error ending performance metric "${label}":`, error);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  // Get average duration for a specific operation
  getAverageDuration(labelPrefix: string): number {
    const relevantMetrics = this.getMetrics().filter(m => 
      m.label.startsWith(labelPrefix) && m.duration !== undefined
    );

    if (relevantMetrics.length === 0) return 0;

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalDuration / relevantMetrics.length;
  }
}

// Create performance monitor instance
export const salesPerfMonitor = new SalesPerformanceMonitor();

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Preload critical resources
export function preloadCriticalResources(): void {
  // Preload any critical resources for sales dashboard
  // This could include images, fonts, or other assets
  salesPerfMonitor.start('critical-resources-preload');
  
  // Example: Preload chart components
  try {
    // Preload recharts components if needed
    import('recharts');
  } catch (error) {
    console.warn('Failed to preload chart components:', error);
  }
  
  salesPerfMonitor.end('critical-resources-preload');
}

// Optimize data fetching with batching
export function batchDataFetch<T>(
  fetchFunctions: (() => Promise<T>)[],
  batchSize: number = 3
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let currentIndex = 0;
    let completed = 0;
    let hasError = false;

    const processBatch = async () => {
      if (hasError || currentIndex >= fetchFunctions.length) {
        if (completed === fetchFunctions.length) {
          resolve(results);
        }
        return;
      }

      const batch = fetchFunctions.slice(currentIndex, currentIndex + batchSize);
      currentIndex += batchSize;

      try {
        const batchPromises = batch.map(async (fetchFn, index) => {
          const result = await fetchFn();
          results[currentIndex - batchSize + index] = result;
          completed++;
        });

        await Promise.all(batchPromises);
        
        // Process next batch
        setTimeout(processBatch, 10); // Small delay to prevent blocking
      } catch (error) {
        hasError = true;
        reject(error);
      }
    };

    processBatch();
  });
}

// Memory usage monitoring
export function getMemoryUsage(): { used: number; total: number; percentage: number } {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
    };
  }
  
  return { used: 0, total: 0, percentage: 0 };
}

// Log memory usage periodically
setInterval(() => {
  const memory = getMemoryUsage();
  if (memory.percentage > 80) {
    console.warn(`⚠️ High memory usage: ${memory.percentage}% (${memory.used}MB / ${memory.total}MB)`);
  }
}, 30000); // Check every 30 seconds 