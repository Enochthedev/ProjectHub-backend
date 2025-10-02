import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from '../page';
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

describe('ProfilePage', () => {
  const mockGetProfile = jest.fn();
  const mockSetActiveTab = jest.fn();
  const mockClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProfileStore.mockReturnValue({
      getProfile: mockGetProfile,
      setActiveTab: mockSetActiveTab,
      clearErrors: mockClearErrors,
      activeTab: 'profile',
      isProfileLoading: false,
      profileError: null,
      profile: null,
      settings: null,
      isSettingsLoading: false,
      settingsError: null,
      isEditing: false,
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      exportData: jest.fn(),
      getSettings: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      updatePrivacySettings: jest.fn(),
      updateGeneralSettings: jest.fn(),
      setEditing: jest.fn(),
    });
  });

  it('shows login message when user is not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
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
      token: null,
      refreshToken: null,
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText('Please log in to view your profile.')).toBeInTheDocument();
  });

  describe('Student Profile', () => {
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

    it('renders student profile information', () => {
      render(<ProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('student@test.com')).toBeInTheDocument();
      expect(screen.getByText('ID: S12345')).toBeInTheDocument();
      expect(screen.getByText('Year 3')).toBeInTheDocument();
    });

    it('shows student interests and skills', () => {
      render(<ProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Web Development')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    it('shows empty state for missing interests', () => {
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

      render(<ProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByText('No interests specified')).toBeInTheDocument();
      expect(screen.getByText('No skills specified')).toBeInTheDocument();
    });
  });

  describe('Supervisor Profile', () => {
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

    it('renders supervisor profile information', () => {
      render(<ProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Supervisor')).toBeInTheDocument();
      expect(screen.getByText('supervisor@test.com')).toBeInTheDocument();
    });

    it('shows supervisor specializations', () => {
      render(<ProfilePage />, { wrapper: createWrapper() });

      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });

  it('switches to edit mode when edit button is clicked', async () => {
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

    render(<ProfilePage />, { wrapper: createWrapper() });

    const editButton = screen.getByText('Edit Profile');
    await user.click(editButton);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
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

    render(<ProfilePage />, { wrapper: createWrapper() });

    const securityTab = screen.getByText('Security');
    await user.click(securityTab);

    expect(mockSetActiveTab).toHaveBeenCalledWith('security');
  });

  it('calls getProfile and clearErrors on mount', () => {
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

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(mockGetProfile).toHaveBeenCalled();
    expect(mockClearErrors).toHaveBeenCalled();
  });

  it('handles profile avatar display', () => {
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

    render(<ProfilePage />, { wrapper: createWrapper() });

    // Check that the avatar shows the first letter of the name
    const avatar = screen.getByText('J');
    expect(avatar).toBeInTheDocument();
    expect(avatar.closest('div')).toHaveClass('bg-black', 'text-white');
  });
});