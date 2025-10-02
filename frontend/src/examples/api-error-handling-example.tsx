'use client';

import React from 'react';
import { api } from '@/lib/api';
import { useErrorProvider } from '@/components/providers/ErrorProvider';
import { useLoadingState } from '@/hooks/useLoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner, InlineLoading } from '@/components/ui/Skeleton';

/**
 * Example component demonstrating API client and error handling integration
 */
export const ApiErrorHandlingExample: React.FC = () => {
  const { handleAsyncError } = useErrorProvider();
  const { isLoading, error, data, execute } = useLoadingState();

  const handleSuccessfulRequest = async () => {
    await execute(async () => {
      // Simulate successful API call
      return await api.get('/projects');
    });
  };

  const handleNetworkError = async () => {
    try {
      await execute(async () => {
        // Simulate network error
        throw new Error('Network error');
      });
    } catch (error) {
      handleAsyncError(error as Error, {
        showToast: true,
        showRetry: true,
        onRetry: handleNetworkError,
        customTitle: 'Connection Failed',
      });
    }
  };

  const handleValidationError = async () => {
    try {
      await execute(async () => {
        // Simulate 400 validation error
        const error = new Error('Invalid input data') as Error & {
          details: {
            statusCode: 400;
            isRetryable: false;
            shouldShowToast: true;
          };
        };
        error.details = {
          statusCode: 400,
          isRetryable: false,
          shouldShowToast: true,
        };
        throw error;
      });
    } catch (error) {
      handleAsyncError(error as Error, {
        showToast: true,
        customTitle: 'Validation Error',
      });
    }
  };

  const handleServerError = async () => {
    try {
      await execute(async () => {
        // Simulate 500 server error
        const error = new Error('Internal server error') as Error & {
          details: {
            statusCode: 500;
            isRetryable: true;
            shouldShowToast: true;
          };
        };
        error.details = {
          statusCode: 500,
          isRetryable: true,
          shouldShowToast: true,
        };
        throw error;
      });
    } catch (error) {
      handleAsyncError(error as Error, {
        showToast: true,
        showRetry: true,
        onRetry: handleServerError,
        customTitle: 'Server Error',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">API Error Handling Examples</h1>
        <p className="text-gray-600 mb-6">
          This demonstrates the integrated API client, error handling, and toast notification system.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleSuccessfulRequest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <InlineLoading text="Loading..." /> : 'Successful Request'}
            </Button>

            <Button
              onClick={handleNetworkError}
              variant="secondary"
              disabled={isLoading}
              className="w-full"
            >
              Network Error (Retryable)
            </Button>

            <Button
              onClick={handleValidationError}
              variant="secondary"
              disabled={isLoading}
              className="w-full"
            >
              Validation Error (400)
            </Button>

            <Button
              onClick={handleServerError}
              variant="secondary"
              disabled={isLoading}
              className="w-full"
            >
              Server Error (500)
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <Card className="p-4 bg-gray-50">
              <div className="flex items-center space-x-3">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-600">Processing request...</span>
              </div>
            </Card>
          )}

          {/* Success State */}
          {data && !error && (
            <Card className="p-4 bg-white border-black">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">Request completed successfully!</span>
              </div>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="p-4 bg-gray-100 border-black">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-black mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-black">Error occurred:</p>
                  <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Features Demonstrated</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Automatic error handling with user-friendly messages</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Toast notifications for different error types</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Retry functionality for retryable errors</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Loading states with skeleton components</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Circuit breaker pattern for repeated failures</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-black">•</span>
            <span>Error logging and monitoring integration</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};