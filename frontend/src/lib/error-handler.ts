'use client';

import { AxiosError } from 'axios';
import { ApiErrorDetails, mapApiError } from './api';

// Error types for different scenarios
export interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    timestamp: Date;
    userAgent: string;
    url: string;
}

export interface ErrorReport {
    error: Error;
    context: ErrorContext;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'client';
}

class ErrorHandlerService {
    private errorQueue: ErrorReport[] = [];
    private isOnline = true;

    constructor() {
        // Monitor online status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.flushErrorQueue();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
            });
        }
    }

    /**
     * Handle API errors with enhanced context
     */
    handleApiError(error: AxiosError, context?: Partial<ErrorContext>): ApiErrorDetails {
        const errorDetails = mapApiError(error);

        const errorReport: ErrorReport = {
            error: new Error(errorDetails.message),
            context: {
                component: context?.component || 'Unknown',
                action: context?.action || 'API Call',
                userId: context?.userId,
                timestamp: new Date(),
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
                url: typeof window !== 'undefined' ? window.location.href : 'Server',
                ...context,
            },
            severity: this.getSeverityFromStatus(errorDetails.statusCode),
            category: this.getCategoryFromStatus(errorDetails.statusCode),
        };

        this.reportError(errorReport);
        return errorDetails;
    }

    /**
     * Handle general application errors
     */
    handleError(error: Error, context?: Partial<ErrorContext>): void {
        const errorReport: ErrorReport = {
            error,
            context: {
                component: context?.component || 'Unknown',
                action: context?.action || 'Unknown Action',
                userId: context?.userId,
                timestamp: new Date(),
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
                url: typeof window !== 'undefined' ? window.location.href : 'Server',
                ...context,
            },
            severity: 'medium',
            category: 'client',
        };

        this.reportError(errorReport);
    }

    /**
     * Report error to monitoring service
     */
    private reportError(errorReport: ErrorReport): void {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group(`🚨 Error Report - ${errorReport.severity.toUpperCase()}`);
            console.error('Error:', errorReport.error);
            console.log('Context:', errorReport.context);
            console.log('Category:', errorReport.category);
            console.groupEnd();
        }

        // Queue error if offline
        if (!this.isOnline) {
            this.errorQueue.push(errorReport);
            return;
        }

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoringService(errorReport);
        }
    }

    /**
     * Send error to external monitoring service
     */
    private async sendToMonitoringService(errorReport: ErrorReport): Promise<void> {
        try {
            // This would integrate with services like Sentry, LogRocket, etc.
            // For now, we'll just log it
            console.log('Sending to monitoring service:', errorReport);

            // Example integration:
            // await fetch('/api/errors', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(errorReport),
            // });
        } catch (monitoringError) {
            console.error('Failed to send error to monitoring service:', monitoringError);
            // Queue for retry
            this.errorQueue.push(errorReport);
        }
    }

    /**
     * Flush queued errors when back online
     */
    private async flushErrorQueue(): Promise<void> {
        const errors = [...this.errorQueue];
        this.errorQueue = [];

        for (const errorReport of errors) {
            await this.sendToMonitoringService(errorReport);
        }
    }

    /**
     * Get error severity based on HTTP status code
     */
    private getSeverityFromStatus(statusCode: number): ErrorReport['severity'] {
        if (statusCode >= 500) return 'critical';
        if (statusCode >= 400) return 'high';
        if (statusCode >= 300) return 'medium';
        return 'low';
    }

    /**
     * Get error category based on HTTP status code
     */
    private getCategoryFromStatus(statusCode: number): ErrorReport['category'] {
        switch (statusCode) {
            case 0:
                return 'network';
            case 400:
            case 422:
                return 'validation';
            case 401:
                return 'authentication';
            case 403:
                return 'authorization';
            case 404:
                return 'client';
            default:
                return statusCode >= 500 ? 'server' : 'client';
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error: Error): string {
        // Check if it's an enhanced API error
        const enhancedError = error as Error & { details?: ApiErrorDetails };
        if (enhancedError.details) {
            return enhancedError.details.message;
        }

        // Handle common error patterns
        if (error.message.includes('Network Error')) {
            return 'Unable to connect to the server. Please check your internet connection.';
        }

        if (error.message.includes('timeout')) {
            return 'The request took too long to complete. Please try again.';
        }

        if (error.message.includes('CORS')) {
            return 'There was a problem connecting to the server. Please try again later.';
        }

        // Return original message if no specific handling
        return error.message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Check if error should show a toast notification
     */
    shouldShowToast(error: Error): boolean {
        const enhancedError = error as Error & { details?: ApiErrorDetails };
        return enhancedError.details?.shouldShowToast ?? true;
    }

    /**
     * Check if error should trigger a redirect
     */
    getRedirectUrl(error: Error): string | undefined {
        const enhancedError = error as Error & { details?: ApiErrorDetails };
        return enhancedError.details?.shouldRedirect;
    }

    /**
     * Check if error is retryable
     */
    isRetryable(error: Error): boolean {
        const enhancedError = error as Error & { details?: ApiErrorDetails };
        return enhancedError.details?.isRetryable ?? false;
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService();

// React hook for error handling
export const useErrorHandler = () => {
    return {
        handleError: (error: Error, context?: Partial<ErrorContext>) => {
            errorHandler.handleError(error, context);
        },
        handleApiError: (error: AxiosError, context?: Partial<ErrorContext>) => {
            return errorHandler.handleApiError(error, context);
        },
        getUserFriendlyMessage: (error: Error) => {
            return errorHandler.getUserFriendlyMessage(error);
        },
        shouldShowToast: (error: Error) => {
            return errorHandler.shouldShowToast(error);
        },
        getRedirectUrl: (error: Error) => {
            return errorHandler.getRedirectUrl(error);
        },
        isRetryable: (error: Error) => {
            return errorHandler.isRetryable(error);
        },
    };
};