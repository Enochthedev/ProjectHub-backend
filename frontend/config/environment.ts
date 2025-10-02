/**
 * Environment Configuration
 * 
 * This module provides type-safe access to environment variables
 * and configuration settings for different deployment environments.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
    // Environment
    NODE_ENV: Environment;

    // API Configuration
    API_URL: string;
    APP_URL: string;
    WS_URL: string;

    // Authentication
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;

    // Feature Flags
    ENABLE_ANALYTICS: boolean;
    ENABLE_ERROR_REPORTING: boolean;
    ENABLE_PERFORMANCE_MONITORING: boolean;
    ENABLE_REACT_QUERY_DEVTOOLS: boolean;
    ENABLE_REDUX_DEVTOOLS: boolean;
    ENABLE_PUSH_NOTIFICATIONS: boolean;
    ENABLE_THEME_SWITCHING: boolean;
    ENABLE_WEB_VITALS: boolean;

    // Debug Settings
    DEBUG_MODE: boolean;
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

    // Cache Settings
    CACHE_TTL: number;
    STALE_TIME: number;

    // Rate Limiting
    RATE_LIMIT_REQUESTS: number;
    RATE_LIMIT_WINDOW: number;

    // File Upload
    MAX_FILE_SIZE: number;
    ALLOWED_FILE_TYPES: string[];

    // Pagination
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;

    // Search Configuration
    SEARCH_DEBOUNCE_MS: number;
    MIN_SEARCH_LENGTH: number;

    // AI Assistant Configuration
    AI_RESPONSE_TIMEOUT: number;
    AI_MAX_MESSAGE_LENGTH: number;

    // Notification Settings
    NOTIFICATION_TIMEOUT: number;

    // Theme Configuration
    DEFAULT_THEME: 'light' | 'dark';

    // Analytics
    GOOGLE_ANALYTICS_ID?: string;
    MIXPANEL_TOKEN?: string;

    // Error Reporting
    SENTRY_DSN?: string;

    // Performance Monitoring
    PERFORMANCE_SAMPLE_RATE: number;

    // CDN Configuration
    CDN_URL?: string;
    ASSET_PREFIX?: string;

    // Monitoring
    HEALTH_CHECK_INTERVAL: number;
}

/**
 * Parse environment variable as boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

/**
 * Parse environment variable as number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as array
 */
function parseArray(value: string | undefined, defaultValue: string[] = []): string[] {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Get current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
    const env = (process.env.NODE_ENV || 'development') as Environment;

    return {
        // Environment
        NODE_ENV: env,

        // API Configuration
        API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
        APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',

        // Authentication
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-key',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',

        // Feature Flags
        ENABLE_ANALYTICS: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_ANALYTICS, env === 'production'),
        ENABLE_ERROR_REPORTING: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING, env === 'production'),
        ENABLE_PERFORMANCE_MONITORING: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING, env === 'production'),
        ENABLE_REACT_QUERY_DEVTOOLS: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS, env === 'development'),
        ENABLE_REDUX_DEVTOOLS: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_REDUX_DEVTOOLS, env === 'development'),
        ENABLE_PUSH_NOTIFICATIONS: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS, env !== 'development'),
        ENABLE_THEME_SWITCHING: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_THEME_SWITCHING, true),
        ENABLE_WEB_VITALS: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS, env !== 'development'),

        // Debug Settings
        DEBUG_MODE: parseBoolean(process.env.NEXT_PUBLIC_DEBUG_MODE, env === 'development'),
        LOG_LEVEL: (process.env.NEXT_PUBLIC_LOG_LEVEL as any) || (env === 'development' ? 'debug' : 'error'),

        // Cache Settings
        CACHE_TTL: parseNumber(process.env.NEXT_PUBLIC_CACHE_TTL, env === 'development' ? 300000 : 1800000),
        STALE_TIME: parseNumber(process.env.NEXT_PUBLIC_STALE_TIME, env === 'development' ? 60000 : 600000),

        // Rate Limiting
        RATE_LIMIT_REQUESTS: parseNumber(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS, env === 'development' ? 1000 : 60),
        RATE_LIMIT_WINDOW: parseNumber(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW, 60000),

        // File Upload
        MAX_FILE_SIZE: parseNumber(process.env.NEXT_PUBLIC_MAX_FILE_SIZE, env === 'development' ? 10485760 : 5242880),
        ALLOWED_FILE_TYPES: parseArray(process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES, ['image/jpeg', 'image/png', 'application/pdf']),

        // Pagination
        DEFAULT_PAGE_SIZE: parseNumber(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE, env === 'production' ? 15 : 20),
        MAX_PAGE_SIZE: parseNumber(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE, env === 'development' ? 100 : 50),

        // Search Configuration
        SEARCH_DEBOUNCE_MS: parseNumber(process.env.NEXT_PUBLIC_SEARCH_DEBOUNCE_MS, env === 'development' ? 300 : 500),
        MIN_SEARCH_LENGTH: parseNumber(process.env.NEXT_PUBLIC_MIN_SEARCH_LENGTH, env === 'development' ? 2 : 3),

        // AI Assistant Configuration
        AI_RESPONSE_TIMEOUT: parseNumber(process.env.NEXT_PUBLIC_AI_RESPONSE_TIMEOUT, env === 'development' ? 30000 : 15000),
        AI_MAX_MESSAGE_LENGTH: parseNumber(process.env.NEXT_PUBLIC_AI_MAX_MESSAGE_LENGTH, env === 'development' ? 2000 : 1000),

        // Notification Settings
        NOTIFICATION_TIMEOUT: parseNumber(process.env.NEXT_PUBLIC_NOTIFICATION_TIMEOUT, env === 'development' ? 5000 : 3000),

        // Theme Configuration
        DEFAULT_THEME: (process.env.NEXT_PUBLIC_DEFAULT_THEME as any) || 'light',

        // Analytics
        GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,

        // Error Reporting
        SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,

        // Performance Monitoring
        PERFORMANCE_SAMPLE_RATE: parseNumber(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE, env === 'development' ? 1.0 : 0.1) / 100,

        // CDN Configuration
        CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
        ASSET_PREFIX: process.env.NEXT_PUBLIC_ASSET_PREFIX,

        // Monitoring
        HEALTH_CHECK_INTERVAL: parseNumber(process.env.NEXT_PUBLIC_HEALTH_CHECK_INTERVAL, 30000),
    };
}

/**
 * Current environment configuration
 */
export const config = getEnvironmentConfig();

/**
 * Check if running in development mode
 */
export const isDevelopment = config.NODE_ENV === 'development';

/**
 * Check if running in staging mode
 */
export const isStaging = config.NODE_ENV === 'production' && config.APP_URL.includes('staging');

/**
 * Check if running in production mode
 */
export const isProduction = config.NODE_ENV === 'production' && !isStaging;

/**
 * Environment-specific feature flags
 */
export const features = {
    // Development only features
    devTools: isDevelopment && {
        reactQuery: config.ENABLE_REACT_QUERY_DEVTOOLS,
        redux: config.ENABLE_REDUX_DEVTOOLS,
    },

    // Production features
    analytics: (isStaging || isProduction) && config.ENABLE_ANALYTICS,
    errorReporting: (isStaging || isProduction) && config.ENABLE_ERROR_REPORTING,
    performanceMonitoring: (isStaging || isProduction) && config.ENABLE_PERFORMANCE_MONITORING,

    // General features
    pushNotifications: config.ENABLE_PUSH_NOTIFICATIONS,
    themeSwitching: config.ENABLE_THEME_SWITCHING,
    webVitals: config.ENABLE_WEB_VITALS,
};

/**
 * API endpoints configuration
 */
export const endpoints = {
    api: config.API_URL,
    ws: config.WS_URL,
    cdn: config.CDN_URL,

    // Health check endpoint
    health: `${config.API_URL}/health`,

    // Authentication endpoints
    auth: {
        login: `${config.API_URL}/auth/login`,
        register: `${config.API_URL}/auth/register`,
        refresh: `${config.API_URL}/auth/refresh`,
        logout: `${config.API_URL}/auth/logout`,
        verifyEmail: `${config.API_URL}/auth/verify-email`,
        forgotPassword: `${config.API_URL}/auth/forgot-password`,
        resetPassword: `${config.API_URL}/auth/reset-password`,
    },

    // Feature endpoints
    projects: `${config.API_URL}/projects`,
    ai: `${config.API_URL}/ai`,
    bookmarks: `${config.API_URL}/bookmarks`,
    milestones: `${config.API_URL}/milestones`,
    recommendations: `${config.API_URL}/recommendations`,
};

/**
 * Validation schema for environment variables
 */
export function validateEnvironment(): void {
    const required = [
        'NEXT_PUBLIC_API_URL',
        'NEXT_PUBLIC_APP_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate URLs
    try {
        new URL(config.API_URL);
        new URL(config.APP_URL);
        new URL(config.NEXTAUTH_URL);
    } catch (error) {
        throw new Error('Invalid URL in environment configuration');
    }

    // Validate numeric values
    if (config.CACHE_TTL < 0 || config.STALE_TIME < 0) {
        throw new Error('Cache TTL and stale time must be positive numbers');
    }

    if (config.MAX_FILE_SIZE < 1024) {
        throw new Error('Max file size must be at least 1KB');
    }

    if (config.DEFAULT_PAGE_SIZE < 1 || config.MAX_PAGE_SIZE < config.DEFAULT_PAGE_SIZE) {
        throw new Error('Invalid pagination configuration');
    }
}

// Validate environment on module load
if (typeof window === 'undefined') {
    validateEnvironment();
}