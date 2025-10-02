import React from 'react';
import { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account | ProjectHub',
  description: 'Create your ProjectHub account to start discovering and managing Final Year Projects.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}