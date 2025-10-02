'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { errorHandler, useErrorHandler, ErrorContext } from '@/lib/error-handler';
import { useApiErrorToast } from '@/components/ui/Toast';

interface ErrorProviderContextType {
  handleError: (error: Error, context?: Partial<ErrorContext>) => void;
  handleApiError: (error: AxiosError, context?: Partial<ErrorContext>) => void;
  handleAsyncError: (
    error: Error, 
    options?: {
      showToast?: boolean;
      showRetry?: boolean;
      onRetry?: () => void;
      customTitle?: string;
      context?: Partial<ErrorContext>;
    }
  ) => void;
}

const ErrorProviderContext = createContext<ErrorProviderContextType | undefined>(undefined);

export const useErrorProvider = () => {
  const context = useContext(ErrorProviderContext);
  if (!context) {
    throw new Error('useErrorProvider must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const router = useRouter();
  const errorHandlerHook = useErrorHandler();
  const showApiErrorToast = useApiErrorToast();

  const handleError = useCallback((error: Error, context?: Partial<ErrorContext>) => {
    errorHandlerHook.handleError(error, context);
    
    // Show toast if appropriate
    if (errorHandlerHook.shouldShowToast(error)) {
      showApiErrorToast(error);
    }
  }, [errorHandlerHook, showApiErrorToast]);

  const handleApiError = useCallback((error: AxiosError, context?: Partial<ErrorContext>) => {
    const errorDetails = errorHandlerHook.handleApiError(error, context);
    
    // Handle redirects
    const redirectUrl = errorHandlerHook.getRedirectUrl(error);
    if (redirectUrl) {
      router.push(redirectUrl);
      return;
    }
    
    // Show toast if appropriate
    if (errorDetails.shouldShowToast) {
      showApiErrorToast(error);
    }
  }, [errorHandlerHook, showApiErrorToast, router]);

  const handleAsyncError = useCallback((
    error: Error,
    options: {
      showToast?: boolean;
      showRetry?: boolean;
      onRetry?: () => void;
      customTitle?: string;
      context?: Partial<ErrorContext>;
    } = {}
  ) => {
    const {
      showToast = true,
      showRetry = false,
      onRetry,
      customTitle,
      context,
    } = options;

    // Handle the error
    if (error instanceof AxiosError) {
      handleApiError(error, context);
    } else {
      handleError(error, context);
    }

    // Show custom toast if requested
    if (showToast && errorHandlerHook.shouldShowToast(error)) {
      showApiErrorToast(error, {
        showRetry: showRetry && errorHandlerHook.isRetryable(error),
        onRetry,
        customTitle,
      });
    }

    // Handle redirects
    const redirectUrl = errorHandlerHook.getRedirectUrl(error);
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, [handleError, handleApiError, errorHandlerHook, showApiErrorToast, router]);

  return (
    <ErrorProviderContext.Provider
      value={{
        handleError,
        handleApiError,
        handleAsyncError,
      }}
    >
      {children}
    </ErrorProviderContext.Provider>
  );
};

// Higher-order component for automatic error handling
export const withErrorHandling = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorProvider>
        <Component {...props} />
      </ErrorProvider>
    );
  };

  WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;
  return WrappedComponent;
};