import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { ApiError } from '@/types/api';

// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken')
          : null;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update tokens in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;

          // Clear tokens and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');

            // Import auth store dynamically to avoid circular dependency
            const { useAuthStore } = await import('@/stores/auth');
            useAuthStore.getState().logout();

            // Redirect to login page
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');

          // Import auth store dynamically to avoid circular dependency
          const { useAuthStore } = await import('@/stores/auth');
          useAuthStore.getState().logout();

          window.location.href = '/login';
        }
      }
    }

    // Handle other common errors
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access forbidden:', error.response?.data || 'No additional error details');
    } else if (error.response?.status === 404) {
      // Not found
      console.error('Resource not found:', error.response?.data || 'No additional error details');
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server error:', error.response?.data || 'No additional error details');
    }

    return Promise.reject(error);
  }
);

// Enhanced error types
export interface ApiErrorDetails {
  message: string;
  statusCode: number;
  isRetryable: boolean;
  shouldShowToast: boolean;
  shouldRedirect?: string;
}

// Circuit breaker for API calls
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds

  canExecute(): boolean {
    if (this.failures < this.threshold) {
      return true;
    }

    const now = Date.now();
    if (now - this.lastFailureTime > this.timeout) {
      this.failures = 0;
      return true;
    }

    return false;
  }

  onSuccess(): void {
    this.failures = 0;
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

const circuitBreaker = new CircuitBreaker();

// Enhanced error mapping utility
export const mapApiError = (error: AxiosError): ApiErrorDetails => {
  // Network error or no response
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection and try again.',
      statusCode: 0,
      isRetryable: true,
      shouldShowToast: true,
    };
  }

  const { status, data } = error.response;
  const apiError = (data || {}) as ApiError;

  // Log the error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`API Error ${status}:`, {
      url: error.config?.url,
      method: error.config?.method,
      data: apiError,
    });
  }

  switch (status) {
    case 400:
      return {
        message: apiError.message || 'Invalid request. Please check your input.',
        statusCode: status,
        isRetryable: false,
        shouldShowToast: true,
      };
    case 401:
      return {
        message: 'You need to log in to access this feature.',
        statusCode: status,
        isRetryable: false,
        shouldShowToast: false, // Handled by auth interceptor
        shouldRedirect: '/login',
      };
    case 403:
      return {
        message: "You don't have permission to perform this action.",
        statusCode: status,
        isRetryable: false,
        shouldShowToast: true,
      };
    case 404:
      return {
        message: 'The requested resource was not found.',
        statusCode: status,
        isRetryable: false,
        shouldShowToast: true,
      };
    case 409:
      return {
        message: 'This action conflicts with existing data.',
        statusCode: status,
        isRetryable: false,
        shouldShowToast: true,
      };
    case 422:
      return {
        message: apiError.message || 'Validation error. Please check your input.',
        statusCode: status,
        isRetryable: false,
        shouldShowToast: true,
      };
    case 429:
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        statusCode: status,
        isRetryable: true,
        shouldShowToast: true,
      };
    case 500:
      return {
        message: 'Server error. Please try again later.',
        statusCode: status,
        isRetryable: true,
        shouldShowToast: true,
      };
    case 502:
      return {
        message: 'Service temporarily unavailable. Please try again later.',
        statusCode: status,
        isRetryable: true,
        shouldShowToast: true,
      };
    case 503:
      return {
        message: 'Service maintenance in progress. Please try again later.',
        statusCode: status,
        isRetryable: true,
        shouldShowToast: true,
      };
    default:
      return {
        message: apiError.message || 'An unexpected error occurred. Please try again.',
        statusCode: status,
        isRetryable: status >= 500,
        shouldShowToast: true,
      };
  }
};

// Retry utility for failed requests
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!circuitBreaker.canExecute()) {
        throw new Error('Service temporarily unavailable due to repeated failures');
      }

      const result = await requestFn();
      circuitBreaker.onSuccess();
      return result;
    } catch (error) {
      lastError = error as Error;
      circuitBreaker.onFailure();

      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (error instanceof AxiosError) {
        const errorDetails = mapApiError(error);
        if (!errorDetails.isRetryable) {
          break;
        }
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
};

// Enhanced API client wrapper with error handling and retry logic
export const api = {
  get: async <T>(url: string, config?: InternalAxiosRequestConfig & { retry?: boolean }) => {
    const requestFn = () => apiClient.get<T>(url, config);

    try {
      if (config?.retry !== false) {
        const response = await retryRequest(requestFn);
        return response.data;
      } else {
        const response = await requestFn();
        return response.data;
      }
    } catch (error) {
      const errorDetails = mapApiError(error as AxiosError);
      const enhancedError = new Error(errorDetails.message) as Error & { details: ApiErrorDetails };
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  },

  post: async <T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig & { retry?: boolean }) => {
    const requestFn = () => apiClient.post<T>(url, data, config);

    try {
      if (config?.retry !== false) {
        const response = await retryRequest(requestFn);
        return response.data;
      } else {
        const response = await requestFn();
        return response.data;
      }
    } catch (error) {
      const errorDetails = mapApiError(error as AxiosError);
      const enhancedError = new Error(errorDetails.message) as Error & { details: ApiErrorDetails };
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  },

  put: async <T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig & { retry?: boolean }) => {
    const requestFn = () => apiClient.put<T>(url, data, config);

    try {
      if (config?.retry !== false) {
        const response = await retryRequest(requestFn);
        return response.data;
      } else {
        const response = await requestFn();
        return response.data;
      }
    } catch (error) {
      const errorDetails = mapApiError(error as AxiosError);
      const enhancedError = new Error(errorDetails.message) as Error & { details: ApiErrorDetails };
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  },

  patch: async <T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig & { retry?: boolean }) => {
    const requestFn = () => apiClient.patch<T>(url, data, config);

    try {
      if (config?.retry !== false) {
        const response = await retryRequest(requestFn);
        return response.data;
      } else {
        const response = await requestFn();
        return response.data;
      }
    } catch (error) {
      const errorDetails = mapApiError(error as AxiosError);
      const enhancedError = new Error(errorDetails.message) as Error & { details: ApiErrorDetails };
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  },

  delete: async <T>(url: string, config?: InternalAxiosRequestConfig & { retry?: boolean }) => {
    const requestFn = () => apiClient.delete<T>(url, config);

    try {
      if (config?.retry !== false) {
        const response = await retryRequest(requestFn);
        return response.data;
      } else {
        const response = await requestFn();
        return response.data;
      }
    } catch (error) {
      const errorDetails = mapApiError(error as AxiosError);
      const enhancedError = new Error(errorDetails.message) as Error & { details: ApiErrorDetails };
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  },
};

export default apiClient;
