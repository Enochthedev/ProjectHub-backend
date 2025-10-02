'use client';

import React from 'react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ExampleLayoutPage: React.FC = () => {
  const customBreadcrumbs = [
    { label: 'Examples', href: '/examples' },
    { label: 'Layout Demo', isCurrentPage: true },
  ];

  return (
    <Layout breadcrumbs={customBreadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Layout System Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the layout and navigation system implementation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Header Features</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Responsive design with mobile menu</li>
              <li>• Global search bar with Cmd+K shortcut</li>
              <li>• User menu with profile and logout</li>
              <li>• Logo navigation to dashboard</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Sidebar Navigation</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Role-based navigation items</li>
              <li>• Collapsible sidebar with persistence</li>
              <li>• Active route highlighting</li>
              <li>• Mobile overlay with backdrop</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Search Modal</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Keyboard navigation (↑↓ arrows)</li>
              <li>• Recent searches persistence</li>
              <li>• Quick actions for common tasks</li>
              <li>• Real-time search with filtering</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Breadcrumbs</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Auto-generated from pathname</li>
              <li>• Custom breadcrumb support</li>
              <li>• Home icon navigation</li>
              <li>• Current page indication</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <kbd className="bg-gray-100 px-2 py-1 text-xs">Cmd+K</kbd> Open search</li>
              <li>• <kbd className="bg-gray-100 px-2 py-1 text-xs">Esc</kbd> Close modals</li>
              <li>• <kbd className="bg-gray-100 px-2 py-1 text-xs">↑↓</kbd> Navigate results</li>
              <li>• <kbd className="bg-gray-100 px-2 py-1 text-xs">Enter</kbd> Select item</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Responsive Design</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Mobile-first approach</li>
              <li>• Touch-friendly interactions</li>
              <li>• Adaptive sidebar behavior</li>
              <li>• Optimized for all screen sizes</li>
            </ul>
          </Card>
        </div>

        <div className="flex space-x-4">
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button variant="secondary" onClick={() => alert('Try Cmd+K to open search!')}>
            Test Search Shortcut
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ExampleLayoutPage;