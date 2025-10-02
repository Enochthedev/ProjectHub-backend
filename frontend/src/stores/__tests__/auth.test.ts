import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth';
import apiClient from '@/lib/api';

// Mock API client
jest.mock('@/lib/api');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

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

describe('Auth Store', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        // Reset store state
        useAuthStore.getState().logout();
    });

    describe('login', () => {
        it('should handle successful login', async () => {
            const mockResponse = {
                data: {
                    user: {
                        id: '1',
                        email: 'test@example.com',
                        role: 'student',
                        isEmailVerified: true,
                        isActive: true,
                    },
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                },
            };

            mockApiClient.post.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                await result.current.login({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.current.user).toEqual(mockResponse.data.user);
            expect(result.current.token).toBe('access-token');
            expect(result.current.refreshToken).toBe('refresh-token');
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'access-token');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
        });

        it('should handle login error', async () => {
            const errorResponse = {
                response: {
                    data: {
                        message: 'Invalid credentials',
                    },
                },
            };

            mockApiClient.post.mockRejectedValueOnce(errorResponse);

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                try {
                    await result.current.login({
                        email: 'test@example.com',
                        password: 'wrongpassword',
                    });
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.user).toBe(null);
            expect(result.current.token).toBe(null);
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Invalid credentials');
        });

        it('should set loading state during login', async () => {
            const mockResponse = {
                data: {
                    user: { id: '1', email: 'test@example.com' },
                    accessToken: 'token',
                    refreshToken: 'refresh',
                },
            };

            // Create a promise that we can control
            let resolvePromise: (value: any) => void;
            const loginPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockApiClient.post.mockReturnValueOnce(loginPromise);

            const { result } = renderHook(() => useAuthStore());

            // Start login
            act(() => {
                result.current.login({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            // Should be loading
            expect(result.current.isLoading).toBe(true);

            // Resolve the promise
            await act(async () => {
                resolvePromise!(mockResponse);
                await loginPromise;
            });

            // Should no longer be loading
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('register', () => {
        it('should handle successful student registration', async () => {
            const mockResponse = {
                data: {
                    user: {
                        id: '1',
                        email: 'student@example.com',
                        role: 'student',
                        isEmailVerified: false,
                        isActive: true,
                    },
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                },
            };

            mockApiClient.post.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useAuthStore());

            const registrationData = {
                email: 'student@example.com',
                password: 'Password123',
                role: 'student' as const,
                profile: {
                    firstName: 'John',
                    lastName: 'Doe',
                    studentId: 'S12345',
                    specialization: 'Computer Science',
                    year: 2024,
                    interests: [],
                    skills: [],
                },
            };

            await act(async () => {
                await result.current.register(registrationData);
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', registrationData);
            expect(result.current.user).toEqual(mockResponse.data.user);
            expect(result.current.isAuthenticated).toBe(true);
        });

        it('should handle registration error', async () => {
            const errorResponse = {
                response: {
                    data: {
                        message: 'Email already exists',
                    },
                },
            };

            mockApiClient.post.mockRejectedValueOnce(errorResponse);

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                try {
                    await result.current.register({
                        email: 'existing@example.com',
                        password: 'Password123',
                        role: 'student',
                        profile: {},
                    });
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Email already exists');
            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('logout', () => {
        it('should clear user data and tokens', () => {
            const { result } = renderHook(() => useAuthStore());

            // Set some initial state
            act(() => {
                result.current.setUser({
                    id: '1',
                    email: 'test@example.com',
                    role: 'student',
                    isEmailVerified: true,
                    isActive: true,
                    profile: {} as any,
                    createdAt: '',
                    updatedAt: '',
                });
                result.current.setTokens({
                    accessToken: 'token',
                    refreshToken: 'refresh',
                });
            });

            // Logout
            act(() => {
                result.current.logout();
            });

            expect(result.current.user).toBe(null);
            expect(result.current.token).toBe(null);
            expect(result.current.refreshToken).toBe(null);
            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.error).toBe(null);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        });
    });

    describe('refreshTokens', () => {
        it('should refresh tokens successfully', async () => {
            const mockResponse = {
                data: {
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                },
            };

            mockApiClient.post.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useAuthStore());

            // Set initial refresh token
            act(() => {
                result.current.setTokens({
                    accessToken: 'old-token',
                    refreshToken: 'old-refresh',
                });
            });

            await act(async () => {
                const newToken = await result.current.refreshTokens();
                expect(newToken).toBe('new-access-token');
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
                refreshToken: 'old-refresh',
            });

            expect(result.current.token).toBe('new-access-token');
            expect(result.current.refreshToken).toBe('new-refresh-token');

            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-access-token');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
        });

        it('should logout on refresh failure', async () => {
            mockApiClient.post.mockRejectedValueOnce(new Error('Refresh failed'));

            const { result } = renderHook(() => useAuthStore());

            // Set initial state
            act(() => {
                result.current.setUser({
                    id: '1',
                    email: 'test@example.com',
                    role: 'student',
                    isEmailVerified: true,
                    isActive: true,
                    profile: {} as any,
                    createdAt: '',
                    updatedAt: '',
                });
                result.current.setTokens({
                    accessToken: 'token',
                    refreshToken: 'refresh',
                });
            });

            await act(async () => {
                try {
                    await result.current.refreshTokens();
                } catch (error) {
                    // Expected to throw
                }
            });

            // Should have logged out
            expect(result.current.user).toBe(null);
            expect(result.current.token).toBe(null);
            expect(result.current.refreshToken).toBe(null);
            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('resetPassword', () => {
        it('should handle successful password reset request', async () => {
            mockApiClient.post.mockResolvedValueOnce({});

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                await result.current.resetPassword('test@example.com');
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
                email: 'test@example.com',
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);
        });

        it('should handle password reset error', async () => {
            const errorResponse = {
                response: {
                    data: {
                        message: 'Email not found',
                    },
                },
            };

            mockApiClient.post.mockRejectedValueOnce(errorResponse);

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                try {
                    await result.current.resetPassword('nonexistent@example.com');
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Email not found');
        });
    });

    describe('confirmResetPassword', () => {
        it('should handle successful password reset confirmation', async () => {
            mockApiClient.post.mockResolvedValueOnce({});

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                await result.current.confirmResetPassword('reset-token', 'NewPassword123');
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password/confirm', {
                token: 'reset-token',
                newPassword: 'NewPassword123',
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });

    describe('verifyEmail', () => {
        it('should handle successful email verification', async () => {
            const mockResponse = {
                data: {
                    id: '1',
                    email: 'test@example.com',
                    role: 'student',
                    isEmailVerified: true,
                    isActive: true,
                },
            };

            mockApiClient.post.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                await result.current.verifyEmail('verification-token');
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
                token: 'verification-token',
            });

            expect(result.current.user).toEqual(mockResponse.data);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });

    describe('updateProfile', () => {
        it('should handle successful profile update', async () => {
            const updatedUser = {
                id: '1',
                email: 'test@example.com',
                role: 'student' as const,
                isEmailVerified: true,
                isActive: true,
                profile: {
                    firstName: 'Updated',
                    lastName: 'Name',
                },
            };

            mockApiClient.patch.mockResolvedValueOnce({ data: updatedUser });

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
                await result.current.updateProfile({
                    profile: { firstName: 'Updated', lastName: 'Name' },
                });
            });

            expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/profile', {
                profile: { firstName: 'Updated', lastName: 'Name' },
            });

            expect(result.current.user).toEqual(updatedUser);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);
        });
    });

    describe('utility actions', () => {
        it('should clear error', () => {
            const { result } = renderHook(() => useAuthStore());

            act(() => {
                result.current.setError('Test error');
            });

            expect(result.current.error).toBe('Test error');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBe(null);
        });

        it('should set loading state', () => {
            const { result } = renderHook(() => useAuthStore());

            act(() => {
                result.current.setLoading(true);
            });

            expect(result.current.isLoading).toBe(true);

            act(() => {
                result.current.setLoading(false);
            });

            expect(result.current.isLoading).toBe(false);
        });
    });
});