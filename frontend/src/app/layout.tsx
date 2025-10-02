import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorProvider } from '@/components/providers/ErrorProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { PerformanceProvider } from '@/components/providers/PerformanceProvider';
import { ToastNotifications } from '@/components/features/notifications/ToastNotifications';
import { MilestoneDeadlineAlerts } from '@/components/features/milestones/MilestoneDeadlineAlerts';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ProjectHub - Final Year Project Management',
  description:
    'Discover, manage, and track Final Year Projects with AI-powered assistance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-black`}
      >
        <ErrorBoundary>
          <PerformanceProvider>
            <ToastProvider>
              <ErrorProvider>
                <QueryProvider>
                  <WebSocketProvider>
                    {children}
                    <ToastNotifications />
                    <MilestoneDeadlineAlerts />
                  </WebSocketProvider>
                </QueryProvider>
              </ErrorProvider>
            </ToastProvider>
          </PerformanceProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
