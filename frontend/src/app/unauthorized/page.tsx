import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Unauthorized | ProjectHub',
  description: 'You do not have permission to access this page.',
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
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
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v2m0 0V9a2 2 0 012-2h4a2 2 0 012 2v2m0 0h4a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h4z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" fullWidth>
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" fullWidth>
              Sign In with Different Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}