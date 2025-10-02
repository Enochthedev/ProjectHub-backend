import axios, { AxiosError } from 'axios';
import { api, mapApiError, ApiErrorDetails } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return the mocked axios instance
mockedAxios.create = jest.fn(() => mockedAxios);

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock window.location
delete (window as any).location;
window.location = { href: '/test' } as any;

describe('API Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('mock-token');
    });

    describe('mapApiError', () => {
        it('should handle network errors', () => {
            const error = new AxiosError('Network Error');
            error.response = undefined;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'Network error. Please check your connection and try again.',
                statusCode: 0,
                isRetryable: true,
                shouldShowToast: true,
            });
        });

        it('should handle 400 Bad Request', () => {
            const error = new AxiosError('Bad Request');
            error.response = {
                status: 400,
                data: { message: 'Invalid input' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'Invalid input',
                statusCode: 400,
                isRetryable: false,
                shouldShowToast: true,
            });
        });

        it('should handle 401 Unauthorized', () => {
            const error = new AxiosError('Unauthorized');
            error.response = {
                status: 401,
                data: { message: 'Unauthorized' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'You need to log in to access this feature.',
                statusCode: 401,
                isRetryable: false,
                shouldShowToast: false,
                shouldRedirect: '/login',
            });
        });

        it('should handle 403 Forbidden', () => {
            const error = new AxiosError('Forbidden');
            error.response = {
                status: 403,
                data: { message: 'Forbidden' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: "You don't have permission to perform this action.",
                statusCode: 403,
                isRetryable: false,
                shouldShowToast: true,
            });
        });

        it('should handle 404 Not Found', () => {
            const error = new AxiosError('Not Found');
            error.response = {
                status: 404,
                data: { message: 'Not Found' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'The requested resource was not found.',
                statusCode: 404,
                isRetryable: false,
                shouldShowToast: true,
            });
        });

        it('should handle 429 Too Many Requests', () => {
            const error = new AxiosError('Too Many Requests');
            error.response = {
                status: 429,
                data: { message: 'Rate limit exceeded' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'Too many requests. Please wait a moment and try again.',
                statusCode: 429,
                isRetryable: true,
                shouldShowToast: true,
            });
        });

        it('should handle 500 Internal Server Error', () => {
            const error = new AxiosError('Internal Server Error');
            error.response = {
                status: 500,
                data: { message: 'Internal Server Error' },
            } as any;

            const result = mapApiError(error);

            expect(result).toEqual({
                message: 'Server error. Please try again later.',
                statusCode: 500,
                isRetryable: true,
                shouldShowToast: true,
            });
        });
    });

    describe('API methods', () => {
        beforeEach(() => {
            // Mock axios.create to return the mocked axios instance
            mockedAxios.create.mockReturnValue(mockedAxios);
        });

        it('should make successful GET request', async () => {
            const mockData = { id: 1, name: 'Test' };
            mockedAxios.get.mockResolvedValueOnce({ data: mockData });

            const result = await api.get('/test');

            expect(result).toEqual(mockData);
            expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
        });

        it('should make successful POST request', async () => {
            const mockData = { id: 1, name: 'Test' };
            const postData = { name: 'Test' };
            mockedAxios.post.mockResolvedValueOnce({ data: mockData });

            const result = await api.post('/test', postData);

            expect(result).toEqual(mockData);
            expect(mockedAxios.post).toHaveBeenCalledWith('/test', postData, undefined);
        });

        it('should handle API errors and throw enhanced error', async () => {
            const axiosError = new AxiosError('Bad Request');
            axiosError.response = {
                status: 400,
                data: { message: 'Invalid input' },
            } as any;

            mockedAxios.get.mockRejectedValueOnce(axiosError);

            try {
                await api.get('/test');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe('Invalid input');
                expect((error as any).details).toEqual({
                    message: 'Invalid input',
                    statusCode: 400,
                    isRetryable: false,
                    shouldShowToast: true,
                });
            }
        });

        it('should retry failed requests when retryable', async () => {
            const axiosError = new AxiosError('Server Error');
            axiosError.response = {
                status: 500,
                data: { message: 'Server Error' },
            } as any;

            // First call fails, second succeeds
            mockedAxios.get
                .mockRejectedValueOnce(axiosError)
                .mockResolvedValueOnce({ data: { success: true } });

            const result = await api.get('/test');

            expect(result).toEqual({ success: true });
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should not retry when retry is disabled', async () => {
            const axiosError = new AxiosError('Server Error');
            axiosError.response = {
                status: 500,
                data: { message: 'Server Error' },
            } as any;

            mockedAxios.get.mockRejectedValueOnce(axiosError);

            try {
                await api.get('/test', { retry: false });
                fail('Should have thrown an error');
            } catch (error) {
                expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            }
        });

        it('should not retry non-retryable errors', async () => {
            const axiosError = new AxiosError('Bad Request');
            axiosError.response = {
                status: 400,
                data: { message: 'Invalid input' },
            } as any;

            mockedAxios.get.mockRejectedValueOnce(axiosError);

            try {
                await api.get('/test');
                fail('Should have thrown an error');
            } catch (error) {
                expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            }
        });
    });
});

describe('Circuit Breaker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.create.mockReturnValue(mockedAxios);
    });

    it('should open circuit after multiple failures', async () => {
        const axiosError = new AxiosError('Server Error');
        axiosError.response = {
            status: 500,
            data: { message: 'Server Error' },
        } as any;

        // Mock multiple failures
        mockedAxios.get.mockRejectedValue(axiosError);

        // Make multiple failed requests to trigger circuit breaker
        for (let i = 0; i < 6; i++) {
            try {
                await api.get('/test');
            } catch (error) {
                // Expected to fail
            }
        }

        // Next request should fail immediately due to circuit breaker
        try {
            await api.get('/test');
            fail('Should have thrown circuit breaker error');
        } catch (error) {
            expect(error.message).toContain('Service temporarily unavailable due to repeated failures');
        }
    });
});