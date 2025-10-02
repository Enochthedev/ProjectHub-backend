import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../LoginForm';
import { RegisterForm } from '../RegisterForm';
import { ForgotPasswordForm } from '../ForgotPasswordForm';
import { ResetPasswordForm } from '../ResetPasswordForm';
import { useAuthStore } from '@/stores/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => 'test-token'),
  })),
}));

// Mock auth store
jest.mock('@/stores/auth');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

const mockAuthStore = {
  login: jest.fn(),
  register: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  isLoading: false,
  error: null,
  clearError: jest.fn(),
};

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);
  });

  describe('LoginForm', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup();
      mockAuthStore.login.mockResolvedValueOnce(undefined);

      render(<LoginForm />);

      // Fill in the form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle login error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockAuthStore.login.mockRejectedValueOnce(new Error(errorMessage));
      mockAuthStore.error = errorMessage;

      render(<LoginForm />);

      // Fill in the form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalled();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();

      render(<LoginForm />);

      // Submit without filling fields
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();

      render(<LoginForm />);

      // Enter invalid email
      await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should toggle password visibility', async () => {
      const user = userEvent.setup();

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // Password toggle button

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('RegisterForm', () => {
    it('should handle successful student registration', async () => {
      const user = userEvent.setup();
      mockAuthStore.register.mockResolvedValueOnce(undefined);

      render(<RegisterForm />);

      // Fill in the form for student
      await user.click(screen.getByLabelText(/student/i));
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/student id/i), 'S12345');
      await user.selectOptions(screen.getByLabelText(/specialization/i), 'Computer Science');
      await user.type(screen.getByLabelText(/year/i), '2024');
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockAuthStore.register).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123',
          role: 'student',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            studentId: 'S12345',
            specialization: 'Computer Science',
            year: 2024,
            interests: [],
            skills: [],
          },
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle successful supervisor registration', async () => {
      const user = userEvent.setup();
      mockAuthStore.register.mockResolvedValueOnce(undefined);

      render(<RegisterForm />);

      // Fill in the form for supervisor
      await user.click(screen.getByLabelText(/supervisor/i));
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/full name/i), 'Dr. Jane Smith');
      await user.click(screen.getByLabelText(/computer science/i));
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockAuthStore.register).toHaveBeenCalledWith({
          email: 'jane@example.com',
          password: 'Password123',
          role: 'supervisor',
          profile: {
            name: 'Dr. Jane Smith',
            specializations: ['Computer Science'],
            isAvailable: true,
            capacity: 5,
          },
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();

      render(<RegisterForm />);

      // Fill in mismatched passwords
      await user.type(screen.getByLabelText(/^password/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength', async () => {
      const user = userEvent.setup();

      render(<RegisterForm />);

      // Enter weak password
      await user.type(screen.getByLabelText(/^password/i), 'weak');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('ForgotPasswordForm', () => {
    it('should handle successful password reset request', async () => {
      const user = userEvent.setup();
      mockAuthStore.resetPassword.mockResolvedValueOnce(undefined);

      render(<ForgotPasswordForm />);

      // Fill in email
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockAuthStore.resetPassword).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should handle reset password error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email not found';
      mockAuthStore.resetPassword.mockRejectedValueOnce(new Error(errorMessage));
      mockAuthStore.error = errorMessage;

      render(<ForgotPasswordForm />);

      // Fill in email
      await user.type(screen.getByLabelText(/email address/i), 'nonexistent@example.com');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockAuthStore.resetPassword).toHaveBeenCalled();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordForm', () => {
    it('should handle successful password reset', async () => {
      const user = userEvent.setup();
      mockAuthStore.confirmResetPassword.mockResolvedValueOnce(undefined);

      render(<ResetPasswordForm token="test-token" />);

      // Fill in new passwords
      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewPassword123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockAuthStore.confirmResetPassword).toHaveBeenCalledWith('test-token', 'NewPassword123');
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid token', () => {
      render(<ResetPasswordForm />);

      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
    });

    it('should validate password confirmation in reset form', async () => {
      const user = userEvent.setup();

      render(<ResetPasswordForm token="test-token" />);

      // Fill in mismatched passwords
      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'DifferentPassword');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LoginForm />);

      // Check for proper form elements
      expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /forgot password/i })).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });
});