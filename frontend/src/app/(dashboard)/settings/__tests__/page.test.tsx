import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../page';
import { useProfileStore } from '@/stores/profile';

// Mock the store
jest.mock('@/stores/profile');

const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SettingsPage', () => {
  const mockGetSettings = jest.fn();
  const mockUpdateGeneralSettings = jest.fn();
  const mockClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfileStore.mockReturnValue({
      settings: {
        id: '1',
        userId: '1',
        notificationPreferences: {
          emailNotifications: true,
          milestoneReminders: true,
          projectUpdates: true,
          aiAssistantUpdates: false,
          weeklyDigest: true,
          marketingEmails: false,
        },
        privacySettings: {
          profileVisibility: 'public',
          showEmail: false,
          showProjects: true,
          allowDirectMessages: true,
          dataProcessingConsent: true,
        },
        language: 'en',
        timezone: 'UTC',
        theme: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      getSettings: mockGetSettings,
      updateGeneralSettings: mockUpdateGeneralSettings,
      clearErrors: mockClearErrors,
      isSettingsLoading: false,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'general',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
    });
  });

  it('renders settings page with tabs', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Application Settings')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('loads settings on mount', async () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });
  });

  it('displays current settings values', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Check that the form is populated with current settings
    expect(screen.getByDisplayValue('English')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTC (Coordinated Universal Time)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('System')).toBeInTheDocument();
  });

  it('detects changes and shows save button', async () => {
    const user = userEvent.setup();
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Initially no save button should be visible
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    // Change language
    const languageSelect = screen.getByDisplayValue('English');
    await user.selectOptions(languageSelect, 'es');

    // Save button should appear
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('submits general settings changes', async () => {
    const user = userEvent.setup();
    mockUpdateGeneralSettings.mockResolvedValue({});
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Change settings
    const languageSelect = screen.getByDisplayValue('English');
    await user.selectOptions(languageSelect, 'es');

    const timezoneSelect = screen.getByDisplayValue('UTC (Coordinated Universal Time)');
    await user.selectOptions(timezoneSelect, 'America/New_York');

    const themeSelect = screen.getByDisplayValue('System');
    await user.selectOptions(themeSelect, 'light');

    // Submit changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateGeneralSettings).toHaveBeenCalledWith({
        language: 'es',
        timezone: 'America/New_York',
        theme: 'light',
      });
    });
  });

  it('resets changes when reset button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Change language
    const languageSelect = screen.getByDisplayValue('English');
    await user.selectOptions(languageSelect, 'es');

    // Reset button should appear
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    // Click reset
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByDisplayValue('English')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Switch to appearance tab
    const appearanceTab = screen.getByText('Appearance');
    await user.click(appearanceTab);

    expect(screen.getByText('Display Preferences')).toBeInTheDocument();
    expect(screen.getByText('Compact Mode')).toBeInTheDocument();

    // Switch to advanced tab
    const advancedTab = screen.getByText('Advanced');
    await user.click(advancedTab);

    expect(screen.getByText('Performance & Data')).toBeInTheDocument();
    expect(screen.getByText('Developer Options')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const errorMessage = 'Failed to update settings';
    
    mockUseProfileStore.mockReturnValue({
      settings: null,
      getSettings: mockGetSettings,
      updateGeneralSettings: mockUpdateGeneralSettings,
      clearErrors: mockClearErrors,
      isSettingsLoading: false,
      settingsError: errorMessage,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'general',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
    });

    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows loading states', () => {
    mockUseProfileStore.mockReturnValue({
      settings: null,
      getSettings: mockGetSettings,
      updateGeneralSettings: mockUpdateGeneralSettings,
      clearErrors: mockClearErrors,
      isSettingsLoading: true,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'general',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
    });

    render(<SettingsPage />, { wrapper: createWrapper() });

    // Form elements should be disabled during loading
    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });

  it('handles missing settings gracefully', () => {
    mockUseProfileStore.mockReturnValue({
      settings: null,
      getSettings: mockGetSettings,
      updateGeneralSettings: mockUpdateGeneralSettings,
      clearErrors: mockClearErrors,
      isSettingsLoading: false,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'general',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
    });

    render(<SettingsPage />, { wrapper: createWrapper() });

    // Should render with default values
    expect(screen.getByText('Application Settings')).toBeInTheDocument();
  });

  it('displays informational content in appearance tab', async () => {
    const user = userEvent.setup();
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    const appearanceTab = screen.getByText('Appearance');
    await user.click(appearanceTab);

    expect(screen.getByText(/This application uses a black and white design system/)).toBeInTheDocument();
  });

  it('displays warning in advanced tab', async () => {
    const user = userEvent.setup();
    
    render(<SettingsPage />, { wrapper: createWrapper() });

    const advancedTab = screen.getByText('Advanced');
    await user.click(advancedTab);

    expect(screen.getByText(/Developer options are intended for debugging purposes only/)).toBeInTheDocument();
  });
});