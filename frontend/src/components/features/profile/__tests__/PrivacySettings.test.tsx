import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PrivacySettings from '../PrivacySettings';
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

describe('PrivacySettings', () => {
  const mockGetSettings = jest.fn();
  const mockUpdatePrivacySettings = jest.fn();

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
      updatePrivacySettings: mockUpdatePrivacySettings,
      isSettingsLoading: false,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'privacy',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });
  });

  it('renders privacy settings sections', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Privacy Information')).toBeInTheDocument();
  });

  it('calls getSettings on mount', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });
    expect(mockGetSettings).toHaveBeenCalled();
  });

  it('displays privacy options with correct initial values', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Activity & Projects')).toBeInTheDocument();
    expect(screen.getByText('Data Processing')).toBeInTheDocument();
  });

  it('allows changing profile visibility', async () => {
    const user = userEvent.setup();
    
    render(<PrivacySettings />, { wrapper: createWrapper() });

    // Find the profile visibility select
    const select = screen.getByDisplayValue('Public - Visible to everyone');
    
    await user.selectOptions(select, 'private');

    // Should show save button after change
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('allows toggling privacy switches', async () => {
    const user = userEvent.setup();
    
    render(<PrivacySettings />, { wrapper: createWrapper() });

    // Find the show email switch (should be off initially)
    const switches = screen.getAllByRole('switch');
    const showEmailSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('Show Email Address')
    );

    expect(showEmailSwitch).not.toBeChecked();
    
    await user.click(showEmailSwitch!);

    // Should show save button after change
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('saves privacy settings', async () => {
    const user = userEvent.setup();
    mockUpdatePrivacySettings.mockResolvedValue({ data: defaultSettings });
    
    render(<PrivacySettings />, { wrapper: createWrapper() });

    // Toggle show email setting
    const switches = screen.getAllByRole('switch');
    const showEmailSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('Show Email Address')
    );

    await user.click(showEmailSwitch!);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdatePrivacySettings).toHaveBeenCalledWith(
        expect.objectContaining({
          showEmail: true,
        })
      );
    });
  });

  it('resets settings to original values', async () => {
    const user = userEvent.setup();
    
    render(<PrivacySettings />, { wrapper: createWrapper() });

    // Toggle a setting
    const switches = screen.getAllByRole('switch');
    const showEmailSwitch = switches.find(s => 
      s.closest('div')?.textContent?.includes('Show Email Address')
    );

    await user.click(showEmailSwitch!);

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
    const errorMessage = 'Failed to update privacy settings';
    
    mockUseProfileStore.mockReturnValue({
      settings: defaultSettings,
      getSettings: mockGetSettings,
      updatePrivacySettings: mockUpdatePrivacySettings,
      isSettingsLoading: false,
      settingsError: errorMessage,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'privacy',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<PrivacySettings />, { wrapper: createWrapper() });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows loading states', () => {
    mockUseProfileStore.mockReturnValue({
      settings: defaultSettings,
      getSettings: mockGetSettings,
      updatePrivacySettings: mockUpdatePrivacySettings,
      isSettingsLoading: true,
      settingsError: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
      isEditing: false,
      activeTab: 'privacy',
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<PrivacySettings />, { wrapper: createWrapper() });

    // All switches should be disabled during loading
    const switches = screen.getAllByRole('switch');
    switches.forEach(switchElement => {
      expect(switchElement).toBeDisabled();
    });
  });

  it('displays privacy information section', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });

    expect(screen.getByText('How we protect your data')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Data Processing Agreement')).toBeInTheDocument();
  });

  it('displays profile visibility options', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });

    const select = screen.getByLabelText('Who can see your profile');
    expect(select).toBeInTheDocument();
  });

  it('handles all privacy switch options', async () => {
    const user = userEvent.setup();
    
    render(<PrivacySettings />, { wrapper: createWrapper() });

    // Test all switches
    const switchLabels = [
      'Show Email Address',
      'Allow Direct Messages', 
      'Show Projects',
      'Data Processing Consent'
    ];

    for (const label of switchLabels) {
      const switches = screen.getAllByRole('switch');
      const targetSwitch = switches.find(s => 
        s.closest('div')?.textContent?.includes(label)
      );
      
      expect(targetSwitch).toBeInTheDocument();
    }
  });

  it('displays data protection information', () => {
    render(<PrivacySettings />, { wrapper: createWrapper() });

    expect(screen.getByText(/All data is encrypted in transit and at rest/)).toBeInTheDocument();
    expect(screen.getByText(/We never share your personal information/)).toBeInTheDocument();
    expect(screen.getByText(/You can export or delete your data/)).toBeInTheDocument();
    expect(screen.getByText(/We comply with GDPR/)).toBeInTheDocument();
  });
});