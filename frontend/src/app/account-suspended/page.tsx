import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Account Suspended | ProjectHub',
  description: 'Your account has been suspended. Please contact support for assistance.',
};

export default function AccountSuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black">Account Suspended</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been temporarily suspended. Please contact our support team for assistance with reactivating your account.
          </p>
        </div>

        <div className="rounded border-2 border-gray-200 bg-gray-50 p-4">
          <h3 className="font-medium text-black">Need Help?</h3>
          <p className="mt-1 text-sm text-gray-600">
            Contact our support team at{' '}
            <a
              href="mailto:support@projecthub.com"
              className="font-medium text-black hover:underline"
            >
              support@projecthub.com
            </a>{' '}
            or call us at{' '}
            <a
              href="tel:+1234567890"
              className="font-medium text-black hover:underline"
            >
              (123) 456-7890
            </a>
          </p>
        </div>

        <div className="space-y-3">
          <a href="mailto:support@projecthub.com">
            <Button variant="primary" size="lg" fullWidth>
              Contact Support
            </Button>
          </a>
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