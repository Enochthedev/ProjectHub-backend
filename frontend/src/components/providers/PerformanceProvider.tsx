/**
 * Performance monitoring provider
 */
'use client';

import { useEffect } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { logBundleSize, addResourceHints } from '@/utils/performance';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const { getMetrics } = usePerformanceMonitoring({
    enableWebVitals: true,
    enableMemoryMonitoring: process.env.NODE_ENV === 'development',
    memoryThreshold: 80,
    reportInterval: 30000,
  });

  useEffect(() => {
    // Log bundle size information in development
    if (process.env.NODE_ENV === 'development') {
      logBundleSize();
    }

    // Add resource hints for external domains
    const externalDomains = [
      // Add your API domain here
      // 'api.projecthub.com',
    ];
    
    if (externalDomains.length > 0) {
      addResourceHints(externalDomains);
    }

    // Log performance metrics periodically in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const metrics = getMetrics();
        if (Object.keys(metrics).length > 0) {
          console.group('Performance Metrics');
          Object.entries(metrics).forEach(([name, duration]) => {
            console.log(`${name}: ${duration.toFixed(2)}ms`);
          });
          console.groupEnd();
        }
      }, 60000); // Every minute

      return () => clearInterval(interval);
    }
  }, [getMetrics]);

  return <>{children}</>;
}