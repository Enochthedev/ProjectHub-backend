import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useMultipleLoadingStates, useAsyncOperation } from '../useLoadingState';

describe('useLoadingState', () => {
    it('should initialize with correct default state', () => {
        const { result } = renderHook(() => useLoadingState());

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toBe(null);
    });

    it('should initialize with provided initial data', () => {
        const initialData = { id: 1, name: 'Test' };
        const { result } = renderHook(() => useLoadingState(initialData));

        expect(result.current.data).toEqual(initialData);
    });

    it('should handle successful async operation', async () => {
        const { result } = renderHook(() => useLoadingState());
        const mockData = { id: 1, name: 'Test' };
        const asyncFn = jest.fn().mockResolvedValue(mockData);

        let executePromise: Promise<any>;

        act(() => {
            executePromise = result.current.execute(asyncFn);
        });

        // Should be loading
        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBe(null);

        await act(async () => {
            const resultData = await executePromise;
            expect(resultData).toEqual(mockData);
        });

        // Should have completed successfully
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toEqual(mockData);
        expect(asyncFn).toHaveBeenCalledTimes(1);
    });

    it('should handle failed async operation', async () => {
        const { result } = renderHook(() => useLoadingState());
        const error = new Error('Test error');
        const asyncFn = jest.fn().mockRejectedValue(error);

        let executePromise: Promise<any>;

        act(() => {
            executePromise = result.current.execute(asyncFn);
        });

        // Should be loading
        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            const resultData = await executePromise;
            expect(resultData).toBe(null);
        });

        // Should have error
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toEqual(error);
        expect(result.current.data).toBe(null);
    });

    it('should handle timeout', async () => {
        jest.useFakeTimers();

        const { result } = renderHook(() => useLoadingState());
        const asyncFn = jest.fn().mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 2000))
        );

        act(() => {
            result.current.execute(asyncFn, { timeout: 1000 });
        });

        // Fast-forward time to trigger timeout
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Should have timeout error
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error?.message).toBe('Request timeout. Please try again.');

        jest.useRealTimers();
    });

    it('should reset state correctly', () => {
        const { result } = renderHook(() => useLoadingState({ initial: 'data' }));

        // Set some state
        act(() => {
            result.current.setError(new Error('Test error'));
        });

        expect(result.current.error).toBeTruthy();

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toEqual({ initial: 'data' });
    });

    it('should set data correctly', () => {
        const { result } = renderHook(() => useLoadingState());
        const newData = { id: 1, name: 'Test' };

        act(() => {
            result.current.setData(newData);
        });

        expect(result.current.data).toEqual(newData);
    });

    it('should set error correctly', () => {
        const { result } = renderHook(() => useLoadingState());
        const error = new Error('Test error');

        act(() => {
            result.current.setError(error);
        });

        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useMultipleLoadingStates', () => {
    it('should handle multiple loading states independently', async () => {
        const { result } = renderHook(() => useMultipleLoadingStates());

        const asyncFn1 = jest.fn().mockResolvedValue('data1');
        const asyncFn2 = jest.fn().mockResolvedValue('data2');

        // Execute both operations
        act(() => {
            result.current.execute('key1', asyncFn1);
            result.current.execute('key2', asyncFn2);
        });

        // Both should be loading
        expect(result.current.getState('key1').isLoading).toBe(true);
        expect(result.current.getState('key2').isLoading).toBe(true);
        expect(result.current.isAnyLoading()).toBe(true);

        // Wait for completion
        await act(async () => {
            await Promise.all([
                new Promise(resolve => setTimeout(resolve, 0)),
                new Promise(resolve => setTimeout(resolve, 0)),
            ]);
        });

        // Both should be completed
        expect(result.current.getState('key1').isLoading).toBe(false);
        expect(result.current.getState('key1').data).toBe('data1');
        expect(result.current.getState('key2').isLoading).toBe(false);
        expect(result.current.getState('key2').data).toBe('data2');
        expect(result.current.isAnyLoading()).toBe(false);
    });

    it('should reset specific state', () => {
        const { result } = renderHook(() => useMultipleLoadingStates());

        // Set some state
        act(() => {
            result.current.execute('key1', () => Promise.resolve('data1'));
        });

        // Reset specific key
        act(() => {
            result.current.reset('key1');
        });

        const state = result.current.getState('key1');
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe(null);
        expect(state.data).toBe(null);
    });

    it('should reset all states', () => {
        const { result } = renderHook(() => useMultipleLoadingStates());

        // Set some states
        act(() => {
            result.current.execute('key1', () => Promise.resolve('data1'));
            result.current.execute('key2', () => Promise.resolve('data2'));
        });

        // Reset all
        act(() => {
            result.current.reset();
        });

        expect(result.current.states).toEqual({});
    });
});

describe('useAsyncOperation', () => {
    it('should handle successful operation with callbacks', async () => {
        const { result } = renderHook(() => useAsyncOperation());
        const onSuccess = jest.fn();
        const onError = jest.fn();
        const mockData = { id: 1, name: 'Test' };

        const operation = jest.fn().mockResolvedValue(mockData);

        await act(async () => {
            const resultData = await result.current.execute(operation, {
                onSuccess,
                onError,
            });
            expect(resultData).toEqual(mockData);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toEqual(mockData);
        expect(onSuccess).toHaveBeenCalledWith(mockData);
        expect(onError).not.toHaveBeenCalled();
    });

    it('should handle failed operation with callbacks', async () => {
        const { result } = renderHook(() => useAsyncOperation());
        const onSuccess = jest.fn();
        const onError = jest.fn();
        const error = new Error('Test error');

        const operation = jest.fn().mockRejectedValue(error);

        await act(async () => {
            try {
                await result.current.execute(operation, {
                    onSuccess,
                    onError,
                });
            } catch (err) {
                expect(err).toEqual(error);
            }
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toEqual(error);
        expect(result.current.data).toBe(null);
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(error);
    });

    it('should reset state correctly', () => {
        const { result } = renderHook(() => useAsyncOperation());

        // Set some state
        act(() => {
            result.current.execute(() => Promise.reject(new Error('Test')));
        });

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.data).toBe(null);
    });
});