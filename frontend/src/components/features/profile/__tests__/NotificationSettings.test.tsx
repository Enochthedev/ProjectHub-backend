import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationSettings from '../NotificationSettings';
import { useProfileStore } from '@/stores/profile';

// Mock the stores
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

describe('NotificationSettings', () => {
  const mockGetSettings = jest.fn();
  const mockUpdateNotificationPreferences = jest.fn();

  const defaultSettings = {
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
      profileVisibility: 'public' as const,
      showEmail: false,
      showProjects: true,
      allowDirectMessages: true,
      dataProcessingConsent: true,
    },
    language: 'en',
    timezone: 'UTC',
    theme: 'system' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfileStore.mockReturnValue({
      settings: defaultSettings,
      getSettings: mockGetSettings,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
      isSettingsLoading: false,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'notifications',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });
  });

  it('renders notification preferences sections', () => {
    render(<NotificationSettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Email Frequency')).toBeInTheDocument();
  });

  it('calls getSettings on mount', () => {
    render(<NotificationSettings />, { wrapper: createWrapper() });
    expect(mockGetSettings).toHaveBeenCalled();
  });

  it('displays notification options with correct initial values', () => {
    render(<NotificationSettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Milestone Reminders')).toBeInTheDocument();
    expect(screen.getByText('Project Updates')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant Updates')).toBeInTheDocument();
    expect(screen.getAllByText('Weekly Digest')).toHaveLength(2); // Appears in both notification preferences and email frequency
    expect(screen.getByText('Marketing Emails')).toBeInTheDocument();
  });

  it('allows toggling notification preferences', async () => {
    const user = userEvent.setup();
    
    render(<NotificationSettings />, { wrapper: createWrapper() });

    // Find the switch for AI Assistant Updates (should be off initially)
    const switches = screen.getAllByRole('switch');
    const aiAssistantSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('AI Assistant Updates')
    );

    expect(aiAssistantSwitch).not.toBeChecked();
    
    await user.click(aiAssistantSwitch!);

    // Should show save button after change
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('saves notification preferences', async () => {
    const user = userEvent.setup();
    mockUpdateNotificationPreferences.mockResolvedValue({ data: defaultSettings });
    
    render(<NotificationSettings />, { wrapper: createWrapper() });

    // Toggle a preference
    const switches = screen.getAllByRole('switch');
    const marketingSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('Marketing Emails')
    );

    await user.click(marketingSwitch!);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          marketingEmails: true,
        })
      );
    });
  });

  it('resets preferences to original values', async () => {
    const user = userEvent.setup();
    
    render(<NotificationSettings />, { wrapper: createWrapper() });

    // Toggle a preference
    const switches = screen.getAllByRole('switch');
    const marketingSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('Marketing Emails')
    );

    await user.click(marketingSwitch!);

    // Should show save/reset buttons
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    // Click reset
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    // Save button should disappear
    await waitFor(() => {
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  it('displays error messages', () => {
    const errorMessage = 'Failed to load settings';
    
    mockUseProfileStore.mockReturnValue({
      settings: null,
      getSettings: mockGetSettings,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
      isSettingsLoading: false,
      settingsError: errorMessage,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'notifications',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<NotificationSettings />, { wrapper: createWrapper() });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows loading states', () => {
    mockUseProfileStore.mockReturnValue({
      settings: defaultSettings,
      getSettings: mockGetSettings,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
      isSettingsLoading: true,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'notifications',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<NotificationSettings />, { wrapper: createWrapper() });

    // All switches should be disabled during loading
    const switches = screen.getAllByRole('switch');
    switches.forEach(switchElement => {
      expect(switchElement).toBeDisabled();
    });
  });

  it('displays email frequency options', () => {
    render(<NotificationSettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Daily Digest')).toBeInTheDocument();
    expect(screen.getAllByText('Weekly Digest')).toHaveLength(2); // Appears in both sections
  });

  it('groups notification options by category', () => {
    render(<NotificationSettings />, { wrapper: createWrapper() });

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Digest')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });
});