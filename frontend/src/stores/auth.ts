import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData, AuthTokens } from '@/types/auth';

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}
import apiClient from '@/lib/api';

interface AuthState {
    // State
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    refreshTokens: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    clearError: () => void;
    resetPassword: (email: string) => Promise<void>;
    confirmResetPassword: (token: string, newPassword: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    resendVerificationEmail: (email?: string) => Promise<void>;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setUser: (user: User | null) => void;
    setTokens: (tokens: AuthTokens | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,

            // Actions
            login: async (credentials: LoginCredentials) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await apiClient.post('/auth/login', credentials);
                    const { user, tokens } = response.data.data;
                    const { accessToken, refreshToken } = tokens;

                    // Store tokens in localStorage for API client
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);
                    }

                    set({
                        user,
                        token: accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Login failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                        isAuthenticated: false,
                    });
                    throw error;
                }
            },

            register: async (data: RegisterData) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await apiClient.post('/auth/register', data);
                    const { user, tokens } = response.data.data;
                    const { accessToken, refreshToken } = tokens;

                    // Store tokens in localStorage for API client
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);
                    }

                    set({
                        user,
                        token: accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Registration failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                        isAuthenticated: false,
                    });
                    throw error;
                }
            },

            logout: () => {
                // Clear tokens from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }

                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            refreshTokens: async () => {
                try {
                    const { refreshToken } = get();
                    if (!refreshToken) {
                        throw new Error('No refresh token available');
                    }

                    const response = await apiClient.post('/auth/refresh', {
                        refreshToken,
                    });
                    const { tokens } = response.data.data;
                    const { accessToken, refreshToken: newRefreshToken } = tokens;

                    // Update tokens in localStorage
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', accessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    set({
                        token: accessToken,
                        refreshToken: newRefreshToken,
                    });

                    return accessToken;
                } catch (error: unknown) {
                    // If refresh fails, logout user
                    get().logout();
                    throw error;
                }
            },

            updateProfile: async (updates: Partial<User>) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await apiClient.patch('/auth/profile', updates);
                    const updatedUser = response.data;

                    set({
                        user: updatedUser,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Profile update failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            resetPassword: async (email: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await apiClient.post('/auth/reset-password', { email });

                    set({
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Password reset failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            confirmResetPassword: async (token: string, newPassword: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await apiClient.post('/auth/reset-password/confirm', {
                        token,
                        newPassword,
                    });

                    set({
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Password reset confirmation failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            verifyEmail: async (token: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await apiClient.post('/auth/verify-email', { token });
                    const updatedUser = response.data;

                    set({
                        user: updatedUser,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Email verification failed';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            resendVerificationEmail: async (email?: string) => {
                try {
                    set({ isLoading: true, error: null });

                    // Use provided email or get from current user
                    const emailToUse = email || get().user?.email;
                    if (!emailToUse) {
                        throw new Error('No email available for verification');
                    }

                    await apiClient.post('/auth/resend-verification', { email: emailToUse });

                    set({
                        isLoading: false,
                        error: null,
                    });
                } catch (error: unknown) {
                    const errorMessage = (error as ApiError).response?.data?.message || 'Failed to resend verification email';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            // Utility actions
            clearError: () => set({ error: null }),
            setLoading: (loading: boolean) => set({ isLoading: loading }),
            setError: (error: string | null) => set({ error }),
            setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
            setTokens: (tokens: AuthTokens | null) => {
                if (tokens) {
                    // Store tokens in localStorage
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('token', tokens.accessToken);
                        localStorage.setItem('refreshToken', tokens.refreshToken);
                    }
                    set({
                        token: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    });
                } else {
                    // Clear tokens
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                    }
                    set({
                        token: null,
                        refreshToken: null,
                    });
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);