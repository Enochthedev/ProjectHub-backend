import apiClient from './api';
import {
    User,
    UpdateProfileData,
    ChangePasswordData,
    UserSettings,
    NotificationPreferences,
    PrivacySettings
} from '@/types/auth';

export interface ProfileApiResponse {
    success: boolean;
    data: User;
    message?: string;
}

export interface SettingsApiResponse {
    success: boolean;
    data: UserSettings;
    message?: string;
}

export interface DataExportResponse {
    success: boolean;
    data: {
        downloadUrl: string;
        expiresAt: string;
    };
    message?: string;
}

// Profile Management
export const profileApi = {
    // Get current user profile
    getProfile: async (): Promise<ProfileApiResponse> => {
        const response = await apiClient.get('/auth/profile');
        return response.data;
    },

    // Update user profile
    updateProfile: async (data: UpdateProfileData): Promise<ProfileApiResponse> => {
        const response = await apiClient.patch('/auth/profile', data);
        return response.data;
    },

    // Change password
    changePassword: async (data: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post('/auth/change-password', data);
        return response.data;
    },

    // Delete account
    deleteAccount: async (password: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete('/auth/account', {
            data: { password }
        });
        return response.data;
    },

    // Export user data
    exportData: async (): Promise<DataExportResponse> => {
        const response = await apiClient.post('/auth/export-data');
        return response.data;
    },
};

// Settings Management
export const settingsApi = {
    // Get user settings
    getSettings: async (): Promise<SettingsApiResponse> => {
        const response = await apiClient.get('/auth/settings');
        return response.data;
    },

    // Update notification preferences
    updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<SettingsApiResponse> => {
        const response = await apiClient.patch('/auth/settings/notifications', preferences);
        return response.data;
    },

    // Update privacy settings
    updatePrivacySettings: async (settings: PrivacySettings): Promise<SettingsApiResponse> => {
        const response = await apiClient.patch('/auth/settings/privacy', settings);
        return response.data;
    },

    // Update general settings
    updateGeneralSettings: async (settings: {
        language?: string;
        timezone?: string;
        theme?: 'light' | 'dark' | 'system'
    }): Promise<SettingsApiResponse> => {
        const response = await apiClient.patch('/auth/settings/general', settings);
        return response.data;
    },
};