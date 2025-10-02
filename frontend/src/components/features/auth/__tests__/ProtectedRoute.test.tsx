import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { ProtectedRoute, usePermissions, RoleGuard } from '../ProtectedRoute';
import { useAuthStore } from '@/stores/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth store
jest.mock('@/stores/auth');

const mockRouter = {
  replace: jest.fn(),
};

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'student' as const,
  isEmailVerified: true,
  isActive: true,
  profile: {},
  createdAt: '',
  updatedAt: '',
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('should render children when user is authenticated', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard');
  });

  it('should show loading state while checking authentication', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render custom loading component', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    render(
      <ProtectedRoute loadingComponent={<div>Custom Loading</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('should redirect when user does not have required role', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'student' },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized');
  });

  it('should allow access when user has required role', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should allow access when user has one of required roles', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'supervisor' },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute requiredRoles={['supervisor', 'admin']}>
        <div>Supervisor/Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Supervisor/Admin Content')).toBeInTheDocument();
  });

  it('should redirect when email verification is required but not verified', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, isEmailVerified: false },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute requireEmailVerification>
        <div>Verified Content</div>
      </ProtectedRoute>
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/verify-email');
  });

  it('should redirect when user account is not active', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, isActive: false },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/account-suspended');
  });

  it('should use custom fallback path', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute fallbackPath="/custom-login">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockRouter.replace).toHaveBeenCalledWith('/custom-login?returnUrl=%2Fdashboard');
  });
});

describe('usePermissions', () => {
  it('should return correct permissions for student', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'student' },
    });

    const TestComponent = () => {
      const permissions = usePermissions();
      return (
        <div>
          <div data-testid="is-student">{permissions.isStudent().toString()}</div>
          <div data-testid="is-supervisor">{permissions.isSupervisor().toString()}</div>
          <div data-testid="is-admin">{permissions.isAdmin().toString()}</div>
          <div data-testid="can-access-student">{permissions.canAccessStudentFeatures().toString()}</div>
          <div data-testid="can-access-supervisor">{permissions.canAccessSupervisorFeatures().toString()}</div>
          <div data-testid="can-access-admin">{permissions.canAccessAdminFeatures().toString()}</div>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-student')).toHaveTextContent('true');
    expect(screen.getByTestId('is-supervisor')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('can-access-student')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-supervisor')).toHaveTextContent('false');
    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('false');
  });

  it('should return correct permissions for supervisor', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'supervisor' },
    });

    const TestComponent = () => {
      const permissions = usePermissions();
      return (
        <div>
          <div data-testid="is-student">{permissions.isStudent().toString()}</div>
          <div data-testid="is-supervisor">{permissions.isSupervisor().toString()}</div>
          <div data-testid="is-admin">{permissions.isAdmin().toString()}</div>
          <div data-testid="can-access-student">{permissions.canAccessStudentFeatures().toString()}</div>
          <div data-testid="can-access-supervisor">{permissions.canAccessSupervisorFeatures().toString()}</div>
          <div data-testid="can-access-admin">{permissions.canAccessAdminFeatures().toString()}</div>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-student')).toHaveTextContent('false');
    expect(screen.getByTestId('is-supervisor')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('can-access-student')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-supervisor')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('false');
  });

  it('should return correct permissions for admin', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'admin' },
    });

    const TestComponent = () => {
      const permissions = usePermissions();
      return (
        <div>
          <div data-testid="is-student">{permissions.isStudent().toString()}</div>
          <div data-testid="is-supervisor">{permissions.isSupervisor().toString()}</div>
          <div data-testid="is-admin">{permissions.isAdmin().toString()}</div>
          <div data-testid="can-access-student">{permissions.canAccessStudentFeatures().toString()}</div>
          <div data-testid="can-access-supervisor">{permissions.canAccessSupervisorFeatures().toString()}</div>
          <div data-testid="can-access-admin">{permissions.canAccessAdminFeatures().toString()}</div>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-student')).toHaveTextContent('false');
    expect(screen.getByTestId('is-supervisor')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-student')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-supervisor')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('true');
  });
});

describe('RoleGuard', () => {
  it('should render children when user has required role', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'admin' },
    });

    render(
      <RoleGuard role="admin">
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should render fallback when user does not have required role', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'student' },
    });

    render(
      <RoleGuard role="admin" fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children when user has one of required roles', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'supervisor' },
    });

    render(
      <RoleGuard roles={['supervisor', 'admin']}>
        <div>Supervisor/Admin Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Supervisor/Admin Content')).toBeInTheDocument();
  });

  it('should render fallback when user is not authenticated', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
    });

    render(
      <RoleGuard role="student" fallback={<div>Please Login</div>}>
        <div>Student Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Please Login')).toBeInTheDocument();
    expect(screen.queryByText('Student Content')).not.toBeInTheDocument();
  });

  it('should render fallback when email verification is required but not verified', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, isEmailVerified: false },
    });

    render(
      <RoleGuard 
        role="student" 
        requireEmailVerification 
        fallback={<div>Please Verify Email</div>}
      >
        <div>Student Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Please Verify Email')).toBeInTheDocument();
    expect(screen.queryByText('Student Content')).not.toBeInTheDocument();
  });

  it('should render null fallback by default', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { ...mockUser, role: 'student' },
    });

    render(
      <RoleGuard role="admin">
        <div>Admin Content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});