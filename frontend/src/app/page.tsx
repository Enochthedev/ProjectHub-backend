'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-black"></div>
              <span className="ml-2 text-xl font-bold text-black">ProjectHub</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
            Manage Your Final Year Projects
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            ProjectHub is a comprehensive platform for discovering, managing, and tracking Final Year Projects. 
            Connect with supervisors, get AI-powered assistance, and streamline your project workflow.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border-2 border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 bg-black"></div>
              <h3 className="text-lg font-semibold text-black">Project Discovery</h3>
              <p className="mt-2 text-sm text-gray-600">
                Browse and discover available Final Year Projects that match your interests and skills.
              </p>
            </div>

            <div className="border-2 border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 bg-black"></div>
              <h3 className="text-lg font-semibold text-black">AI Assistant</h3>
              <p className="mt-2 text-sm text-gray-600">
                Get personalized guidance and recommendations from our intelligent AI assistant.
              </p>
            </div>

            <div className="border-2 border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 bg-black"></div>
              <h3 className="text-lg font-semibold text-black">Progress Tracking</h3>
              <p className="mt-2 text-sm text-gray-600">
                Track milestones, manage deadlines, and monitor your project progress effectively.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} ProjectHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
