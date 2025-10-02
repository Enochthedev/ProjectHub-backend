import React from 'react';
import { EmailVerificationReminder } from '@/components/features/auth';
import Layout from '@/components/layout/Layout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Layout>
      <EmailVerificationReminder />
      {children}
    </Layout>
  );
}