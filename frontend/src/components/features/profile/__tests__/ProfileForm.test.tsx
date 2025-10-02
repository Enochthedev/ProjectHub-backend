import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileForm from '../ProfileForm';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';

// Mock the stores
jest.mock('@/stores/auth');
jest.mock('@/stores/profile');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
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

describe('ProfileForm', () => {
  const mockOnCancel = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockUpdateProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfileStore.mockReturnValue({
      updateProfile: mockUpdateProfile,
      isProfileLoading: false,
      profileError: null,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      activeTab: 'profile',
      getProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });
  });

  describe('Student Profile Form', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'student@test.com',
          role: 'student',
          isEmailVerified: true,
          isActive: true,
          profile: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            studentId: 'S12345',
            specialization: 'Computer Science',
            year: 3,
            interests: ['AI', 'Web Development'],
            skills: ['JavaScript', 'Python'],
            profileUpdatedAt: '2024-01-01T00:00:00Z',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        login: jest.fn(),
        logout: jest.fn(),
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

    it('renders student profile form with existing data', () => {
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('allows adding new interests', async () => {
      const user = userEvent.setup();
      
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      const interestInput = screen.getByPlaceholderText('Add an interest');
      const addButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('class')?.includes('w-4')
      );

      await user.type(interestInput, 'Machine Learning');
      await user.click(addButton!);

      expect(screen.getAllByText('Machine Learning')[1]).toBeInTheDocument(); // Get the second instance (the tag, not the option)
    });

    it('allows removing interests', async () => {
      const user = userEvent.setup();
      
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      const removeButton = screen.getAllByRole('button').find(btn => 
        btn.closest('div')?.textContent?.includes('AI')
      );

      await user.click(removeButton!);

      expect(screen.queryByText('AI')).not.toBeInTheDocument();
    });

    it('submits form with updated data', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue({});
      
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Doe',
            specialization: 'Computer Science',
            year: 3,
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('displays validation errors', async () => {
      const user = userEvent.setup();
      
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });
  });

  describe('Supervisor Profile Form', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '2',
          email: 'supervisor@test.com',
          role: 'supervisor',
          isEmailVerified: true,
          isActive: true,
          profile: {
            id: '2',
            name: 'Dr. Smith',
            specializations: ['AI', 'Machine Learning'],
            isAvailable: true,
            capacity: 5,
            profileUpdatedAt: '2024-01-01T00:00:00Z',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        login: jest.fn(),
        logout: jest.fn(),
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

    it('renders supervisor profile form with existing data', () => {
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('allows updating capacity', async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue({});
      
      render(
        <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      const capacityInput = screen.getByDisplayValue('5');
      await user.clear(capacityInput);
      await user.type(capacityInput, '8');

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            capacity: 8, // Form converts string to number
          })
        );
      });
    });
  });

  it('handles API errors', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to update profile';
    mockUpdateProfile.mockRejectedValue(new Error(errorMessage));
    
    mockUseProfileStore.mockReturnValue({
      updateProfile: mockUpdateProfile,
      isProfileLoading: false,
      profileError: errorMessage,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      activeTab: 'profile',
      getProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
      setActiveTab: jest.fn(),
      clearErrors: jest.fn(),
    });

    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'student@test.com',
        role: 'student',
        isEmailVerified: true,
        isActive: true,
        profile: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'S12345',
          specialization: 'Computer Science',
          year: 3,
          interests: [],
          skills: [],
          profileUpdatedAt: '2024-01-01T00:00:00Z',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      login: jest.fn(),
      logout: jest.fn(),
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

    render(
      <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'student@test.com',
        role: 'student',
        isEmailVerified: true,
        isActive: true,
        profile: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'S12345',
          specialization: 'Computer Science',
          year: 3,
          interests: [],
          skills: [],
          profileUpdatedAt: '2024-01-01T00:00:00Z',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      login: jest.fn(),
      logout: jest.fn(),
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

    render(
      <ProfileForm onCancel={mockOnCancel} onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});