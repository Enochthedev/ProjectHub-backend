'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';

interface EmailVerificationProps {
  token?: string;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ token: propToken }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationEmail, isLoading, error, clearError, user } = useAuthStore();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  // Get token from props or URL params
  const token = propToken || searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleVerification();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerification = async () => {
    if (!token) {
      setVerificationStatus('error');
      return;
    }

    try {
      clearError();
      await verifyEmail(token);
      setVerificationStatus('success');
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (_err) {
      setVerificationStatus('error');
    }
  };

  const handleResendVerification = async () => {
    try {
      clearError();
      await resendVerificationEmail();
    } catch (_err) {
      // Error is handled by the store
    }
  };

  // Success state
  if (verificationStatus === 'success') {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black">Email Verified!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your email has been successfully verified. You can now access all features of ProjectHub.
          </p>
        </div>

        <div className="text-center">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="primary"
            size="lg"
            fullWidth
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (verificationStatus === 'error' || !token) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black">Verification Failed</h1>
          <p className="mt-2 text-sm text-gray-600">
            {error || 'This verification link is invalid or has expired.'}
          </p>
        </div>

        {error && (
          <div className="rounded border-2 border-black bg-gray-50 p-3">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-black"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-black">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {user && !user.isEmailVerified && (
            <Button
              onClick={handleResendVerification}
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
          )}

          <Button
            onClick={() => router.push('/login')}
            variant="secondary"
            size="lg"
            fullWidth
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
        <h1 className="text-2xl font-bold text-black">Verifying Email</h1>
        <p className="mt-2 text-sm text-gray-600">
          Please wait while we verify your email address...
        </p>
      </div>
    </div>
  );
};

// Component for showing verification reminder to unverified users
export const EmailVerificationReminder: React.FC = () => {
  const { user, resendVerificationEmail, isLoading, clearError } = useAuthStore();
  const [isVisible, setIsVisible] = useState(true);

  if (!user || user.isEmailVerified || !isVisible) {
    return null;
  }

  const handleResend = async () => {
    try {
      clearError();
      await resendVerificationEmail();
    } catch (_err) {
      // Error is handled by the store
    }
  };

  return (
    <div className="border-b-2 border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg
            className="mr-2 h-5 w-5 text-black"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-black">
              Please verify your email address
            </p>
            <p className="text-xs text-gray-600">
              Check your inbox for a verification link or{' '}
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="font-medium text-black hover:underline focus:outline-none focus:underline disabled:opacity-50"
              >
                {isLoading ? 'sending...' : 'resend email'}
              </button>
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-black focus:outline-none"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};