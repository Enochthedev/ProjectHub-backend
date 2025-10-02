import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SecuritySettings from '../SecuritySettings';
import { useProfileStore } from '@/stores/profile';
import { useAuthStore } from '@/stores/auth';

// Mock the stores
jest.mock('@/stores/profile');
jest.mock('@/stores/auth');

const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

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

describe('SecuritySettings', () => {
  const mockChangePassword = jest.fn();
  const mockDeleteAccount = jest.fn();
  const mockExportData = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfileStore.mockReturnValue({
      changePassword: mockChangePassword,
      deleteAccount: mockDeleteAccount,
      exportData: mockExportData,
      isProfileLoading: false,
      profileError: null,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      activeTab: 'security',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    mockUseAuthStore.mockReturnValue({
      logout: mockLogout,
      user: null,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      clearError: jest.fn(),
      isLoading: false,
      error: null,
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });
  });

  it('renders security settings sections', () => {
    render(<SecuritySettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Password & Security')).toBeInTheDocument();
    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('shows change password button initially', () => {
    render(<SecuritySettings />, { wrapper: createWrapper() });

    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument();
  });

  it('shows password form when change password is clicked', async () => {
    const user = userEvent.setup();
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('validates password form', async () => {
    const user = userEvent.setup();
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    const updateButton = screen.getByText('Update Password');
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    await user.type(screen.getByLabelText('Current Password'), 'oldpassword');
    await user.type(screen.getByLabelText('New Password'), 'newpassword');
    await user.type(screen.getByLabelText('Confirm New Password'), 'differentpassword');

    const updateButton = screen.getByText('Update Password');
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('submits password change successfully', async () => {
    const user = userEvent.setup();
    mockChangePassword.mockResolvedValue({});
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    await user.type(screen.getByLabelText('Current Password'), 'oldpassword');
    await user.type(screen.getByLabelText('New Password'), 'newpassword');
    await user.type(screen.getByLabelText('Confirm New Password'), 'newpassword');

    const updateButton = screen.getByText('Update Password');
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
        confirmPassword: 'newpassword',
      });
    });
  });

  it('handles data export', async () => {
    const user = userEvent.setup();
    const mockDownloadUrl = 'https://example.com/download';
    mockExportData.mockResolvedValue(mockDownloadUrl);
    
    // Mock document.createElement and related methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation();

    render(<SecuritySettings />, { wrapper: createWrapper() });

    const exportButton = screen.getByText('Export My Data');
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe(mockDownloadUrl);
      expect(mockLink.download).toBe('my-data-export.json');
      expect(mockLink.click).toHaveBeenCalled();
    });

    // Cleanup mocks
    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('opens delete account modal', async () => {
    const user = userEvent.setup();
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const deleteButton = screen.getByText('Delete Account');
    await user.click(deleteButton);

    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter your password to confirm')).toBeInTheDocument();
  });

  it('validates delete account form', async () => {
    const user = userEvent.setup();
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const deleteButton = screen.getByText('Delete Account');
    await user.click(deleteButton);

    await user.type(screen.getByLabelText('Enter your password to confirm'), 'password');
    await user.type(screen.getByPlaceholderText('DELETE'), 'WRONG');

    const confirmDeleteButton = screen.getAllByText('Delete Account')[1]; // Second one in modal
    await user.click(confirmDeleteButton);

    await waitFor(() => {
      expect(screen.getByText('Please type DELETE to confirm')).toBeInTheDocument();
    });
  });

  it('deletes account successfully', async () => {
    const user = userEvent.setup();
    mockDeleteAccount.mockResolvedValue({});
    
    render(<SecuritySettings />, { wrapper: createWrapper() });

    const deleteButton = screen.getByText('Delete Account');
    await user.click(deleteButton);

    await user.type(screen.getByLabelText('Enter your password to confirm'), 'password');
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');

    const confirmDeleteButton = screen.getAllByText('Delete Account')[1]; // Second one in modal
    await user.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('password');
    });
  });

  it('displays error messages', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to change password';
    
    mockUseProfileStore.mockReturnValue({
      changePassword: mockChangePassword,
      deleteAccount: mockDeleteAccount,
      exportData: mockExportData,
      isProfileLoading: false,
      profileError: errorMessage,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      activeTab: 'security',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<SecuritySettings />, { wrapper: createWrapper() });

    // Click to show password form first
    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows loading states', async () => {
    const user = userEvent.setup();
    
    mockUseProfileStore.mockReturnValue({
      changePassword: mockChangePassword,
      deleteAccount: mockDeleteAccount,
      exportData: mockExportData,
      isProfileLoading: true,
      profileError: null,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      activeTab: 'security',
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    render(<SecuritySettings />, { wrapper: createWrapper() });

    // Click to show password form first
    const changePasswordButton = screen.getByText('Change Password');
    await user.click(changePasswordButton);

    const updateButton = screen.getByText('Update Password');
    expect(updateButton).toBeDisabled();
  });
});