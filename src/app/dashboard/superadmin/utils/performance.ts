import React from 'react';

// Performance monitoring utilities for dashboard optimization

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  // Start timing a specific operation
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  // End timing and record the metric
  end(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      // Silently ignore missing timers to avoid console spam
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now()
    });

    this.timers.delete(name);
    
    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  // Safe end - only ends if timer exists
  safeEnd(name: string): number {
    if (this.timers.has(name)) {
      return this.end(name);
    }
    return 0;
  }

  // Check if timer exists
  hasTimer(name: string): boolean {
    return this.timers.has(name);
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get metrics for a specific operation
  getMetricsFor(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Get Core Web Vitals if available
  getCoreWebVitals(): Promise<any> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {
            LCP: 0, // Largest Contentful Paint
            FID: 0, // First Input Delay
            CLS: 0, // Cumulative Layout Shift
          };

          entries.forEach((entry: any) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            } else if (entry.entryType === 'first-input') {
              vitals.FID = entry.processingStart - entry.startTime;
            } else if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.CLS += entry.value;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Timeout after 10 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve({ LCP: 0, FID: 0, CLS: 0 });
        }, 10000);
      } else {
        resolve({ LCP: 0, FID: 0, CLS: 0 });
      }
    });
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Hook for tracking component load times
export const usePerformanceTracking = (componentName: string) => {
  React.useEffect(() => {
    perfMonitor.start(`${componentName}-mount`);
    
    return () => {
      perfMonitor.safeEnd(`${componentName}-mount`);
    };
  }, [componentName]);
};

// Utility to measure async operations
export const measureAsync = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  perfMonitor.start(name);
  try {
    const result = await operation();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.safeEnd(name);
    throw error;
  }
};

// Lightweight preload critical resources (only what's actually needed immediately)
export const preloadCriticalResources = () => {
  // Only preload resources that will be used immediately
  // Remove font preloading as it's causing warnings and fonts are loaded via CSS anyway
  
  // Preload critical API endpoints if needed (commented out to avoid unnecessary requests)
  /*
  if ('fetch' in window) {
    // Only preload if we know these endpoints exist and will be called immediately
    const criticalEndpoints = [
      '/api/sales-analytics',
    ];

    criticalEndpoints.forEach(endpoint => {
      // Use a very low priority fetch to warm up the connection
      fetch(endpoint, { 
        method: 'HEAD',
        priority: 'low' as any
      }).catch(() => {
        // Silently fail for preloading
      });
    });
  }
  */
  
  // Log that preloading completed
  if (process.env.NODE_ENV === 'development') {
    console.log('⚡ Critical resources preload completed');
  }
};

export default PerformanceMonitor; 