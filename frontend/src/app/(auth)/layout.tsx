import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-black"></div>
                <span className="text-xl font-bold text-black">ProjectHub</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="/about"
                className="text-sm text-gray-600 hover:text-black focus:outline-none focus:underline"
              >
                About
              </a>
              <a
                href="/help"
                className="text-sm text-gray-600 hover:text-black focus:outline-none focus:underline"
              >
                Help
              </a>
              <a
                href="/contact"
                className="text-sm text-gray-600 hover:text-black focus:outline-none focus:underline"
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} ProjectHub. All rights reserved.
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <a
                href="/privacy"
                className="text-xs text-gray-500 hover:text-black focus:outline-none focus:underline"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-xs text-gray-500 hover:text-black focus:outline-none focus:underline"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}