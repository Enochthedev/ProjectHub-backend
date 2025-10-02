import { create } from 'zustand';
import {
    User,
    UpdateProfileData,
    ChangePasswordData,
    UserSettings,
    NotificationPreferences,
    PrivacySettings
} from '@/types/auth';
import { profileApi, settingsApi } from '@/lib/profile-api';

interface ProfileState {
    // Profile State
    profile: User | null;
    isProfileLoading: boolean;
    profileError: string | null;

    // Settings State
    settings: UserSettings | null;
    isSettingsLoading: boolean;
    settingsError: string | null;

    // UI State
    isEditing: boolean;
    activeTab: 'profile' | 'security' | 'notifications' | 'privacy' | 'general';

    // Profile Actions
    getProfile: () => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    changePassword: (data: ChangePasswordData) => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
    exportData: () => Promise<string>;

    // Settings Actions
    getSettings: () => Promise<void>;
    updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>;
    updatePrivacySettings: (settings: PrivacySettings) => Promise<void>;
    updateGeneralSettings: (settings: {
        language?: string;
        timezone?: string;
        theme?: 'light' | 'dark' | 'system'
    }) => Promise<void>;

    // UI Actions
    setEditing: (editing: boolean) => void;
    setActiveTab: (tab: 'profile' | 'security' | 'notifications' | 'privacy' | 'general') => void;
    clearErrors: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    // Initial State
    profile: null,
    isProfileLoading: false,
    profileError: null,
    settings: null,
    isSettingsLoading: false,
    settingsError: null,
    isEditing: false,
    activeTab: 'profile',

    // Profile Actions
    getProfile: async () => {
        try {
            set({ isProfileLoading: true, profileError: null });
            const response = await profileApi.getProfile();
            set({
                profile: response.data,
                isProfileLoading: false
            });
        } catch (error: any) {
            set({
                profileError: error.response?.data?.message || 'Failed to load profile',
                isProfileLoading: false
            });
        }
    },

    updateProfile: async (data: UpdateProfileData) => {
        try {
            set({ isProfileLoading: true, profileError: null });
            const response = await profileApi.updateProfile(data);
            set({
                profile: response.data,
                isProfileLoading: false,
                isEditing: false
            });
        } catch (error: any) {
            set({
                profileError: error.response?.data?.message || 'Failed to update profile',
                isProfileLoading: false
            });
            throw error;
        }
    },

    changePassword: async (data: ChangePasswordData) => {
        try {
            set({ isProfileLoading: true, profileError: null });
            await profileApi.changePassword(data);
            set({ isProfileLoading: false });
        } catch (error: any) {
            set({
                profileError: error.response?.data?.message || 'Failed to change password',
                isProfileLoading: false
            });
            throw error;
        }
    },

    deleteAccount: async (password: string) => {
        try {
            set({ isProfileLoading: true, profileError: null });
            await profileApi.deleteAccount(password);
            set({ isProfileLoading: false });
        } catch (error: any) {
            set({
                profileError: error.response?.data?.message || 'Failed to delete account',
                isProfileLoading: false
            });
            throw error;
        }
    },

    exportData: async (): Promise<string> => {
        try {
            set({ isProfileLoading: true, profileError: null });
            const response = await profileApi.exportData();
            set({ isProfileLoading: false });
            return response.data.downloadUrl;
        } catch (error: any) {
            set({
                profileError: error.response?.data?.message || 'Failed to export data',
                isProfileLoading: false
            });
            throw error;
        }
    },

    // Settings Actions
    getSettings: async () => {
        try {
            set({ isSettingsLoading: true, settingsError: null });
            const response = await settingsApi.getSettings();
            set({
                settings: response.data,
                isSettingsLoading: false
            });
        } catch (error: any) {
            set({
                settingsError: error.response?.data?.message || 'Failed to load settings',
                isSettingsLoading: false
            });
        }
    },

    updateNotificationPreferences: async (preferences: NotificationPreferences) => {
        try {
            set({ isSettingsLoading: true, settingsError: null });
            const response = await settingsApi.updateNotificationPreferences(preferences);
            set({
                settings: response.data,
                isSettingsLoading: false
            });
        } catch (error: any) {
            set({
                settingsError: error.response?.data?.message || 'Failed to update notification preferences',
                isSettingsLoading: false
            });
            throw error;
        }
    },

    updatePrivacySettings: async (privacySettings: PrivacySettings) => {
        try {
            set({ isSettingsLoading: true, settingsError: null });
            const response = await settingsApi.updatePrivacySettings(privacySettings);
            set({
                settings: response.data,
                isSettingsLoading: false
            });
        } catch (error: any) {
            set({
                settingsError: error.response?.data?.message || 'Failed to update privacy settings',
                isSettingsLoading: false
            });
            throw error;
        }
    },

    updateGeneralSettings: async (generalSettings: {
        language?: string;
        timezone?: string;
        theme?: 'light' | 'dark' | 'system'
    }) => {
        try {
            set({ isSettingsLoading: true, settingsError: null });
            const response = await settingsApi.updateGeneralSettings(generalSettings);
            set({
                settings: response.data,
                isSettingsLoading: false
            });
        } catch (error: any) {
            set({
                settingsError: error.response?.data?.message || 'Failed to update general settings',
                isSettingsLoading: false
            });
            throw error;
        }
    },

    // UI Actions
    setEditing: (editing: boolean) => set({ isEditing: editing }),
    setActiveTab: (tab: 'profile' | 'security' | 'notifications' | 'privacy' | 'general') =>
        set({ activeTab: tab }),
    clearErrors: () => set({ profileError: null, settingsError: null }),
}));