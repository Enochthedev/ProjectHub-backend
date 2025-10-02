import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata: Metadata = {
  title: 'Reset Password | ProjectHub',
  description: 'Create a new password for your ProjectHub account.',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}