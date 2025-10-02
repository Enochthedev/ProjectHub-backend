'use client';

import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
    isLoading: boolean;
    error: Error | null;
    data: unknown;
}

export interface LoadingOptions {
    showToast?: boolean;
    retryable?: boolean;
    timeout?: number;
}

/**
 * Hook for managing loading states with error handling
 */
export const useLoadingState = <T = unknown>(initialData?: T) => {
    const [state, setState] = useState<LoadingState>({
        isLoading: false,
        error: null,
        data: initialData || null,
    });

    const timeoutRef = useRef<NodeJS.Timeout>();

    const execute = useCallback(async <R = T>(
        asyncFunction: () => Promise<R>,
        options: LoadingOptions = {}
    ): Promise<R | null> => {
        const { timeout = 30000 } = options;

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
        }));

        // Set timeout
        if (timeout > 0) {
            timeoutRef.current = setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: new Error('Request timeout. Please try again.'),
                }));
            }, timeout);
        }

        try {
            const result = await asyncFunction();

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            setState({
                isLoading: false,
                error: null,
                data: result,
            });

            return result;
        } catch (error) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error as Error,
            }));

            return null;
        }
    }, []);

    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setState({
            isLoading: false,
            error: null,
            data: initialData || null,
        });
    }, [initialData]);

    const setData = useCallback((data: T) => {
        setState(prev => ({
            ...prev,
            data,
        }));
    }, []);

    const setError = useCallback((error: Error) => {
        setState(prev => ({
            ...prev,
            error,
            isLoading: false,
        }));
    }, []);

    return {
        ...state,
        execute,
        reset,
        setData,
        setError,
    };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultipleLoadingStates = () => {
    const [states, setStates] = useState<Record<string, LoadingState>>({});

    const execute = useCallback(async <T>(
        key: string,
        asyncFunction: () => Promise<T>,
        options: LoadingOptions = {}
    ): Promise<T | null> => {
        const { timeout = 30000 } = options;

        setStates(prev => ({
            ...prev,
            [key]: {
                isLoading: true,
                error: null,
                data: prev[key]?.data || null,
            },
        }));

        try {
            const result = await Promise.race([
                asyncFunction(),
                new Promise<never>((_, reject) => {
                    if (timeout > 0) {
                        setTimeout(() => reject(new Error('Request timeout')), timeout);
                    }
                }),
            ]);

            setStates(prev => ({
                ...prev,
                [key]: {
                    isLoading: false,
                    error: null,
                    data: result,
                },
            }));

            return result;
        } catch (error) {
            setStates(prev => ({
                ...prev,
                [key]: {
                    isLoading: false,
                    error: error as Error,
                    data: prev[key]?.data || null,
                },
            }));

            return null;
        }
    }, []);

    const reset = useCallback((key?: string) => {
        if (key) {
            setStates(prev => ({
                ...prev,
                [key]: {
                    isLoading: false,
                    error: null,
                    data: null,
                },
            }));
        } else {
            setStates({});
        }
    }, []);

    const getState = useCallback((key: string): LoadingState => {
        return states[key] || {
            isLoading: false,
            error: null,
            data: null,
        };
    }, [states]);

    const isAnyLoading = useCallback(() => {
        return Object.values(states).some(state => state.isLoading);
    }, [states]);

    return {
        states,
        execute,
        reset,
        getState,
        isAnyLoading,
    };
};

/**
 * Hook for managing async operations with automatic error handling
 */
export const useAsyncOperation = <T = unknown>() => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(async (
        operation: () => Promise<T>,
        options: {
            onSuccess?: (data: T) => void;
            onError?: (error: Error) => void;
            showErrorToast?: boolean;
        } = {}
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await operation();
            setData(result);
            options.onSuccess?.(result);
            return result;
        } catch (err) {
            const error = err as Error;
            setError(error);
            options.onError?.(error);

            if (options.showErrorToast !== false) {
                // This would integrate with the toast system
                console.error('Operation failed:', error.message);
            }

            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        isLoading,
        error,
        data,
        execute,
        reset,
    };
};