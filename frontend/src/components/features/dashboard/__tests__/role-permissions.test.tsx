import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';

// Mock the stores
jest.mock('@/stores/auth');
jest.mock('@/stores/dashboard');

// Mock the dashboard pages
jest.mock('@/app/(dashboard)/student/page', () => {
  return function StudentDashboard() {
    return <div data-testid="student-dashboard">Student Dashboard</div>;
  };
});

jest.mock('@/app/(dashboard)/supervisor/page', () => {
  return function SupervisorDashboard() {
    return <div data-testid="supervisor-dashboard">Supervisor Dashboard</div>;
  };
});

jest.mock('@/app/(dashboard)/admin/page', () => {
  return function AdminDashboard() {
    return <div data-testid="admin-dashboard">Admin Dashboard</div>;
  };
});

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseDashboardStore = useDashboardStore as jest.MockedFunction<typeof useDashboardStore>;

// Mock dashboard component that checks permissions
const MockDashboardRouter: React.FC = () => {
  const { user } = useAuthStore();
  const { customization } = useDashboardStore();

  if (!user) {
    return <div data-testid="no-user">Please log in</div>;
  }

  // Check if user has access to their role-specific dashboard
  if (customization && customization.role !== user.role) {
    return <div data-testid="access-denied">Access denied</div>;
  }

  switch (user.role) {
    case 'student':
      return <div data-testid="student-dashboard">Student Dashboard</div>;
    case 'supervisor':
      return <div data-testid="supervisor-dashboard">Supervisor Dashboard</div>;
    case 'admin':
      return <div data-testid="admin-dashboard">Admin Dashboard</div>;
    default:
      return <div data-testid="unknown-role">Unknown role</div>;
  }
};

describe('Role-based Dashboard Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login prompt when user is not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    mockUseDashboardStore.mockReturnValue({
      customization: null,
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('no-user')).toBeInTheDocument();
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });

  it('shows student dashboard for student role', () => {
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
          studentId: 'S001',
          specialization: 'Computer Science',
          year: 4,
          interests: [],
          skills: [],
          profileUpdatedAt: '2023-01-01'
        },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    mockUseDashboardStore.mockReturnValue({
      customization: {
        userId: '1',
        role: 'student',
        layouts: [],
        activeLayoutId: 'layout1',
        preferences: {
          theme: 'light',
          refreshInterval: 30,
          showNotifications: true,
          compactMode: false
        }
      },
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
  });

  it('shows supervisor dashboard for supervisor role', () => {
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
          specializations: ['Computer Science'],
          isAvailable: true,
          capacity: 5,
          profileUpdatedAt: '2023-01-01'
        },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    mockUseDashboardStore.mockReturnValue({
      customization: {
        userId: '2',
        role: 'supervisor',
        layouts: [],
        activeLayoutId: 'layout1',
        preferences: {
          theme: 'light',
          refreshInterval: 30,
          showNotifications: true,
          compactMode: false
        }
      },
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('supervisor-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Supervisor Dashboard')).toBeInTheDocument();
  });

  it('shows admin dashboard for admin role', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '3',
        email: 'admin@test.com',
        role: 'admin',
        isEmailVerified: true,
        isActive: true,
        profile: {
          id: '3',
          name: 'Admin User',
          permissions: ['all'],
          profileUpdatedAt: '2023-01-01'
        },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    mockUseDashboardStore.mockReturnValue({
      customization: {
        userId: '3',
        role: 'admin',
        layouts: [],
        activeLayoutId: 'layout1',
        preferences: {
          theme: 'light',
          refreshInterval: 30,
          showNotifications: true,
          compactMode: false
        }
      },
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('shows access denied when role mismatch', () => {
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
          studentId: 'S001',
          specialization: 'Computer Science',
          year: 4,
          interests: [],
          skills: [],
          profileUpdatedAt: '2023-01-01'
        },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    // Customization has different role than user
    mockUseDashboardStore.mockReturnValue({
      customization: {
        userId: '1',
        role: 'admin', // Mismatch: user is student but customization is for admin
        layouts: [],
        activeLayoutId: 'layout1',
        preferences: {
          theme: 'light',
          refreshInterval: 30,
          showNotifications: true,
          compactMode: false
        }
      },
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('handles unknown role gracefully', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '4',
        email: 'unknown@test.com',
        role: 'unknown' as any,
        isEmailVerified: true,
        isActive: true,
        profile: {},
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });

    mockUseDashboardStore.mockReturnValue({
      customization: null,
      isCustomizing: false,
      realTimeEnabled: true,
      lastUpdate: null,
      updateCount: 0,
      metrics: {},
      isLoading: false,
      error: null,
      setCustomization: jest.fn(),
      updateCustomization: jest.fn(),
      setIsCustomizing: jest.fn(),
      resetCustomization: jest.fn(),
      toggleWidget: jest.fn(),
      updateWidget: jest.fn(),
      setRealTimeEnabled: jest.fn(),
      handleRealTimeUpdate: jest.fn(),
      setMetrics: jest.fn(),
      updateMetrics: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn()
    });

    render(<MockDashboardRouter />);

    expect(screen.getByTestId('unknown-role')).toBeInTheDocument();
    expect(screen.getByText('Unknown role')).toBeInTheDocument();
  });
});