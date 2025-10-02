import { AxiosError } from 'axios';
import { errorHandler, useErrorHandler } from '../error-handler';
import { renderHook } from '@testing-library/react';

// Mock console methods
const originalConsole = console;
beforeAll(() => {
    global.console = {
        ...console,
        error: jest.fn(),
        log: jest.fn(),
        group: jest.fn(),
        groupEnd: jest.fn(),
    };
});

afterAll(() => {
    global.console = originalConsole;
});

// Mock window and navigator
Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'test-agent' },
    writable: true,
});

// Mock location
delete (global as any).window;
(global as any).window = {
    location: { href: 'http://localhost:3000/test' },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
};

describe('ErrorHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleApiError', () => {
        it('should handle network errors correctly', () => {
            const error = new AxiosError('Network Error');
            error.response = undefined;

            const result = errorHandler.handleApiError(error, {
                component: 'TestComponent',
                action: 'fetchData',
            });

            expect(result).toEqual({
                message: 'Network error. Please check your connection and try again.',
                statusCode: 0,
                isRetryable: true,
                shouldShowToast: true,
            });

            expect(console.group).toHaveBeenCalledWith('🚨 Error Report - HIGH');
        });

        it('should handle 401 errors with redirect', () => {
            const error = new AxiosError('Unauthorized');
            error.response = {
                status: 401,
                data: { message: 'Unauthorized' },
            } as any;

            const result = errorHandler.handleApiError(error);

            expect(result).toEqual({
                message: 'You need to log in to access this feature.',
                statusCode: 401,
                isRetryable: false,
                shouldShowToast: false,
                shouldRedirect: '/login',
            });
        });

        it('should handle 500 errors as critical', () => {
            const error = new AxiosError('Server Error');
            error.response = {
                status: 500,
                data: { message: 'Internal Server Error' },
            } as any;

            const result = errorHandler.handleApiError(error);

            expect(result.statusCode).toBe(500);
            expect(console.group).toHaveBeenCalledWith('🚨 Error Report - CRITICAL');
        });
    });

    describe('handleError', () => {
        it('should handle general errors', () => {
            const error = new Error('Test error');

            errorHandler.handleError(error, {
                component: 'TestComponent',
                action: 'testAction',
            });

            expect(console.group).toHaveBeenCalledWith('🚨 Error Report - MEDIUM');
            expect(console.error).toHaveBeenCalledWith('Error:', error);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return enhanced error message for API errors', () => {
            const error = new Error('Test message') as Error & {
                details: { message: 'Enhanced message' }
            };
            error.details = { message: 'Enhanced message' } as any;

            const message = errorHandler.getUserFriendlyMessage(error);

            expect(message).toBe('Enhanced message');
        });

        it('should handle network errors', () => {
            const error = new Error('Network Error occurred');

            const message = errorHandler.getUserFriendlyMessage(error);

            expect(message).toBe('Unable to connect to the server. Please check your internet connection.');
        });

        it('should handle timeout errors', () => {
            const error = new Error('Request timeout exceeded');

            const message = errorHandler.getUserFriendlyMessage(error);

            expect(message).toBe('The request took too long to complete. Please try again.');
        });

        it('should handle CORS errors', () => {
            const error = new Error('CORS policy blocked');

            const message = errorHandler.getUserFriendlyMessage(error);

            expect(message).toBe('There was a problem connecting to the server. Please try again later.');
        });

        it('should return original message for unknown errors', () => {
            const error = new Error('Unknown error');

            const message = errorHandler.getUserFriendlyMessage(error);

            expect(message).toBe('Unknown error');
        });
    });

    describe('shouldShowToast', () => {
        it('should return true for errors that should show toast', () => {
            const error = new Error('Test') as Error & {
                details: { shouldShowToast: true }
            };
            error.details = { shouldShowToast: true } as any;

            const result = errorHandler.shouldShowToast(error);

            expect(result).toBe(true);
        });

        it('should return false for errors that should not show toast', () => {
            const error = new Error('Test') as Error & {
                details: { shouldShowToast: false }
            };
            error.details = { shouldShowToast: false } as any;

            const result = errorHandler.shouldShowToast(error);

            expect(result).toBe(false);
        });

        it('should default to true for errors without details', () => {
            const error = new Error('Test');

            const result = errorHandler.shouldShowToast(error);

            expect(result).toBe(true);
        });
    });

    describe('getRedirectUrl', () => {
        it('should return redirect URL for errors that require redirect', () => {
            const error = new Error('Test') as Error & {
                details: { shouldRedirect: '/login' }
            };
            error.details = { shouldRedirect: '/login' } as any;

            const result = errorHandler.getRedirectUrl(error);

            expect(result).toBe('/login');
        });

        it('should return undefined for errors without redirect', () => {
            const error = new Error('Test');

            const result = errorHandler.getRedirectUrl(error);

            expect(result).toBeUndefined();
        });
    });

    describe('isRetryable', () => {
        it('should return true for retryable errors', () => {
            const error = new Error('Test') as Error & {
                details: { isRetryable: true }
            };
            error.details = { isRetryable: true } as any;

            const result = errorHandler.isRetryable(error);

            expect(result).toBe(true);
        });

        it('should return false for non-retryable errors', () => {
            const error = new Error('Test') as Error & {
                details: { isRetryable: false }
            };
            error.details = { isRetryable: false } as any;

            const result = errorHandler.isRetryable(error);

            expect(result).toBe(false);
        });

        it('should default to false for errors without details', () => {
            const error = new Error('Test');

            const result = errorHandler.isRetryable(error);

            expect(result).toBe(false);
        });
    });
});

describe('useErrorHandler hook', () => {
    it('should provide error handling functions', () => {
        const { result } = renderHook(() => useErrorHandler());

        expect(result.current).toHaveProperty('handleError');
        expect(result.current).toHaveProperty('handleApiError');
        expect(result.current).toHaveProperty('getUserFriendlyMessage');
        expect(result.current).toHaveProperty('shouldShowToast');
        expect(result.current).toHaveProperty('getRedirectUrl');
        expect(result.current).toHaveProperty('isRetryable');
    });

    it('should handle errors through the hook', () => {
        const { result } = renderHook(() => useErrorHandler());
        const error = new Error('Test error');

        result.current.handleError(error, { component: 'TestComponent' });

        expect(console.group).toHaveBeenCalledWith('🚨 Error Report - MEDIUM');
    });
});