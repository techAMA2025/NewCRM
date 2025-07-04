/*
  Performance monitoring utilities for the admin dashboard
*/

interface PerformanceMetric {
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  start(metricName: string) {
    this.metrics.set(metricName, {
      startTime: performance.now()
    });
  }

  end(metricName: string) {
    const metric = this.metrics.get(metricName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
    }
  }

  safeEnd(metricName: string) {
    const metric = this.metrics.get(metricName);
    if (metric && !metric.endTime) {
      this.end(metricName);
    }
  }

  getDuration(metricName: string): number | null {
    const metric = this.metrics.get(metricName);
    return metric?.duration || null;
  }

  clear() {
    this.metrics.clear();
  }
}

export const perfMonitor = new PerformanceMonitor();

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload any critical resources for admin dashboard
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}; 