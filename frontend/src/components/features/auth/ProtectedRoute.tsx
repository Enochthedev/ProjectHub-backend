'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'supervisor' | 'admin';
  requiredRoles?: Array<'student' | 'supervisor' | 'admin'>;
  requireEmailVerification?: boolean;
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
  requireEmailVerification = false,
  fallbackPath = '/login',
  loadingComponent,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth store to initialize
      if (isLoading) {
        return;
      }

      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        // Store the intended destination
        const returnUrl = encodeURIComponent(pathname);
        router.replace(`${fallbackPath}?returnUrl=${returnUrl}`);
        return;
      }

      // Check role requirements
      if (requiredRole && user.role !== requiredRole) {
        router.replace('/unauthorized');
        return;
      }

      if (requiredRoles && !requiredRoles.includes(user.role)) {
        router.replace('/unauthorized');
        return;
      }

      // Check email verification requirement
      if (requireEmailVerification && !user.isEmailVerified) {
        router.replace('/verify-email');
        return;
      }

      // Check if user account is active
      if (!user.isActive) {
        router.replace('/account-suspended');
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [
    isAuthenticated,
    user,
    isLoading,
    requiredRole,
    requiredRoles,
    requireEmailVerification,
    router,
    pathname,
    fallbackPath,
  ]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;

  return AuthenticatedComponent;
}

// Hook for checking permissions
export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasRole = (role: 'student' | 'supervisor' | 'admin'): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: Array<'student' | 'supervisor' | 'admin'>): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isStudent = (): boolean => hasRole('student');
  const isSupervisor = (): boolean => hasRole('supervisor');
  const isAdmin = (): boolean => hasRole('admin');

  const canAccessAdminFeatures = (): boolean => isAdmin();
  const canAccessSupervisorFeatures = (): boolean => isSupervisor() || isAdmin();
  const canAccessStudentFeatures = (): boolean => isStudent() || isSupervisor() || isAdmin();

  const isEmailVerified = (): boolean => user?.isEmailVerified ?? false;
  const isAccountActive = (): boolean => user?.isActive ?? false;

  return {
    user,
    hasRole,
    hasAnyRole,
    isStudent,
    isSupervisor,
    isAdmin,
    canAccessAdminFeatures,
    canAccessSupervisorFeatures,
    canAccessStudentFeatures,
    isEmailVerified,
    isAccountActive,
  };
};

// Component for role-based rendering
interface RoleGuardProps {
  children: React.ReactNode;
  role?: 'student' | 'supervisor' | 'admin';
  roles?: Array<'student' | 'supervisor' | 'admin'>;
  fallback?: React.ReactNode;
  requireEmailVerification?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  role,
  roles,
  fallback = null,
  requireEmailVerification = false,
}) => {
  const { user, hasRole, hasAnyRole, isEmailVerified } = usePermissions();

  // Check if user exists
  if (!user) {
    return <>{fallback}</>;
  }

  // Check email verification if required
  if (requireEmailVerification && !isEmailVerified()) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (roles && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};