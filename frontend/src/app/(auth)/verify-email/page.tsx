import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { EmailVerification } from '@/components/features/auth/EmailVerification';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata: Metadata = {
  title: 'Verify Email | ProjectHub',
  description: 'Verify your email address to complete your ProjectHub account setup.',
};

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <EmailVerification />
      </Suspense>
    </div>
  );
}