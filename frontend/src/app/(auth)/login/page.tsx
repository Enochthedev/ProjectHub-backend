import React from 'react';
import { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In | ProjectHub',
  description: 'Sign in to your ProjectHub account to manage your projects and connect with supervisors.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}