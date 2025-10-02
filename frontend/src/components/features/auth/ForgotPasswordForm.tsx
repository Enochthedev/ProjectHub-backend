'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm: React.FC = () => {
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearError();
      await resetPassword(data.email);
      setIsSubmitted(true);
    } catch (_err) {
      // Error is handled by the store
    }
  };

  if (isSubmitted) {
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
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black">Check Your Email</h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-black">{getValues('email')}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded border-2 border-gray-200 bg-gray-50 p-4">
            <h3 className="font-medium text-black">What&apos;s next?</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>• Check your email inbox</li>
              <li>• Click the reset link in the email</li>
              <li>• Create a new password</li>
              <li>• Sign in with your new password</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn&apos;t receive the email?{' '}
              <button
                onClick={() => setIsSubmitted(false)}
                className="font-medium text-black hover:underline focus:outline-none focus:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-black hover:underline focus:outline-none focus:underline"
          >
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black">Forgot Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          error={errors.email?.message}
          autoComplete="email"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-black hover:underline focus:outline-none focus:underline"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </div>
  );
};