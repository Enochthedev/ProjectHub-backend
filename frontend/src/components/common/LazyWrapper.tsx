/**
 * Wrapper component for lazy-loaded components with loading states
 */
import { Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function LazyWrapper({ 
  children, 
  fallback,
  errorFallback 
}: LazyWrapperProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="lg" />
    </div>
  );

  const defaultErrorFallback = (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <div className="text-gray-600 mb-4">
        Failed to load component
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
      >
        Retry
      </button>
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback || defaultErrorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Higher-order component for wrapping lazy components
 */
export function withLazyWrapper<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <LazyWrapper 
        fallback={options?.fallback}
        errorFallback={options?.errorFallback}
      >
        <Component {...props} />
      </LazyWrapper>
    );
  };
}