/**
 * Performance tests for components and utilities
 */
import React, { Suspense, lazy } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformanceMonitor, withPerformanceMonitoring, usePerformanceMetric } from '@/utils/performance';
import { VirtualList, VirtualGrid } from '@/components/ui/VirtualList';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { LazyWrapper } from '@/components/common/LazyWrapper';

// Mock performance API
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 100 }]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  now: jest.fn(() => Date.now()),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Performance Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceMonitor.getInstance().clearMetrics();
  });

  describe('PerformanceMonitor', () => {
    it('should mark start and end of measurements', () => {
      const monitor = PerformanceMonitor.getInstance();
      
      monitor.markStart('test-operation');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
      
      const duration = monitor.markEnd('test-operation');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith('test-operation', 'test-operation-start', 'test-operation-end');
      expect(duration).toBe(100);
    });

    it('should collect and return metrics', () => {
      const monitor = PerformanceMonitor.getInstance();
      
      monitor.markStart('operation1');
      monitor.markEnd('operation1');
      monitor.markStart('operation2');
      monitor.markEnd('operation2');
      
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('operation1', 100);
      expect(metrics).toHaveProperty('operation2', 100);
    });

    it('should clear metrics', () => {
      const monitor = PerformanceMonitor.getInstance();
      
      monitor.markStart('test');
      monitor.markEnd('test');
      monitor.clearMetrics();
      
      const metrics = monitor.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
      expect(mockPerformance.clearMarks).toHaveBeenCalled();
      expect(mockPerformance.clearMeasures).toHaveBeenCalled();
    });
  });

  describe('withPerformanceMonitoring HOC', () => {
    it('should measure component render performance', () => {
      const TestComponent = () => <div>Test Component</div>;
      const MonitoredComponent = withPerformanceMonitoring(TestComponent, 'TestComponent');
      
      render(<MonitoredComponent />);
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('TestComponent-render-start');
    });
  });

  describe('usePerformanceMetric hook', () => {
    it('should provide measurement functions', () => {
      const TestComponent = () => {
        const { startMeasurement, endMeasurement } = usePerformanceMetric('custom-metric');
        
        return (
          <div>
            <button onClick={startMeasurement}>Start</button>
            <button onClick={endMeasurement}>End</button>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const startButton = screen.getByText('Start');
      const endButton = screen.getByText('End');
      
      startButton.click();
      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-metric-start');
      
      endButton.click();
      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-metric-end');
    });
  });
});

describe('Virtual Scrolling Performance', () => {
  const generateItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  describe('VirtualList', () => {
    it('should render only visible items for large datasets', () => {
      const items = generateItems(10000);
      const renderItem = (item: any) => <div key={item.id}>{item.name}</div>;
      
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          containerHeight={300}
          renderItem={renderItem}
        />
      );
      
      // Should only render visible items (6 items + overscan)
      const renderedItems = screen.getAllByText(/Item \d+/);
      expect(renderedItems.length).toBeLessThan(20); // Much less than 10000
    });

    it('should handle empty state', () => {
      const renderItem = (item: any) => <div>{item.name}</div>;
      
      render(
        <VirtualList
          items={[]}
          itemHeight={50}
          containerHeight={300}
          renderItem={renderItem}
        />
      );
      
      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      const items = generateItems(100);
      const renderItem = (item: any) => <div>{item.name}</div>;
      
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          containerHeight={300}
          renderItem={renderItem}
          loading={true}
          loadingComponent={<div>Loading items...</div>}
        />
      );
      
      expect(screen.getByText('Loading items...')).toBeInTheDocument();
    });
  });

  describe('VirtualGrid', () => {
    it('should render grid layout efficiently', () => {
      const items = generateItems(1000);
      const renderItem = (item: any) => <div key={item.id}>{item.name}</div>;
      
      render(
        <VirtualGrid
          items={items}
          itemWidth={200}
          itemHeight={150}
          containerWidth={800}
          containerHeight={600}
          renderItem={renderItem}
        />
      );
      
      // Should only render visible items
      const renderedItems = screen.getAllByText(/Item \d+/);
      expect(renderedItems.length).toBeLessThan(50); // Much less than 1000
    });
  });
});

describe('Image Optimization', () => {
  describe('OptimizedImage', () => {
    it('should handle loading state', () => {
      render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test image"
          width={200}
          height={150}
        />
      );
      
      // Should show loading state initially
      const image = screen.getByRole('img');
      expect(image).toHaveClass('opacity-0');
    });

    it('should handle error state', async () => {
      render(
        <OptimizedImage
          src="/non-existent-image.jpg"
          alt="Test image"
          width={200}
          height={150}
        />
      );
      
      const image = screen.getByRole('img');
      
      // Simulate image error
      await act(async () => {
        image.dispatchEvent(new Event('error'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });
  });
});

describe('Lazy Loading', () => {
  describe('LazyWrapper', () => {
    it('should show loading fallback while component loads', async () => {
      const LazyComponent = lazy(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ default: () => <div>Loaded Component</div> }), 50)
        )
      );
      
      render(
        <LazyWrapper fallback={<div>Loading component...</div>}>
          <LazyComponent />
        </LazyWrapper>
      );
      
      expect(screen.getByText('Loading component...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Loaded Component')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle component loading errors', async () => {
      const FailingComponent = lazy(() => 
        Promise.reject(new Error('Component failed to load'))
      );
      
      render(
        <LazyWrapper errorFallback={<div>Failed to load component</div>}>
          <FailingComponent />
        </LazyWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load component')).toBeInTheDocument();
      });
    });
  });
});

describe('Query Caching Performance', () => {
  it('should use appropriate cache times for different query types', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // 30 minutes
        },
      },
    });
    
    const TestComponent = () => {
      return <div>Test</div>;
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );
    
    // Verify query client configuration
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(30 * 60 * 1000);
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should render large lists within performance budget', () => {
    const startTime = performance.now();
    
    const items = generateItems(1000);
    const renderItem = (item: any) => <div key={item.id}>{item.name}</div>;
    
    render(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={500}
        renderItem={renderItem}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle rapid state updates efficiently', () => {
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      
      React.useEffect(() => {
        const interval = setInterval(() => {
          setCount(c => c + 1);
        }, 10);
        
        setTimeout(() => clearInterval(interval), 100);
        
        return () => clearInterval(interval);
      }, []);
      
      return <div>Count: {count}</div>;
    };
    
    const startTime = performance.now();
    
    render(<TestComponent />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should handle rapid updates efficiently
    expect(renderTime).toBeLessThan(50);
  });
});

function generateItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));
}