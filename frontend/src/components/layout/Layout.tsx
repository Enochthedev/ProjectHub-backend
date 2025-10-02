'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useNavigation } from '@/hooks/useNavigation';
import { useResponsive } from '@/hooks/useResponsive';
import { useScreenReaderAnnouncements } from '@/hooks/useAccessibility';
import Header from './Header';
import Sidebar from './Sidebar';
import Breadcrumb, { BreadcrumbItem, useBreadcrumbs } from './Breadcrumb';
import GlobalSearchModal from './GlobalSearchModal';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  breadcrumbs,
  showBreadcrumbs = true,
  className 
}) => {
  const { user } = useAuthStore();
  const { isMobile, isDesktop } = useResponsive();
  const { announceToScreenReader, liveRegion } = useScreenReaderAnnouncements();
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isSearchModalOpen,
    currentPath,
    toggleSidebar,
    closeSidebar,
    toggleSidebarCollapse,
    openSearchModal,
    closeSearchModal,
    getSidebarWidth,
  } = useNavigation();

  const generatedBreadcrumbs = useBreadcrumbs(currentPath, breadcrumbs);

  // Skip links for accessibility
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
  ];

  // Announce page changes to screen readers
  useEffect(() => {
    if (generatedBreadcrumbs.length > 0) {
      const currentPage = generatedBreadcrumbs[generatedBreadcrumbs.length - 1];
      announceToScreenReader(`Navigated to ${currentPage.label}`);
    }
  }, [currentPath, announceToScreenReader, generatedBreadcrumbs]);

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (isDesktop && isSidebarOpen && isMobile) {
      closeSidebar();
    }
  }, [isDesktop, isMobile, isSidebarOpen, closeSidebar]);

  // Don't render layout if user is not authenticated
  if (!user) {
    return <>{children}</>;
  }

  const sidebarWidth = getSidebarWidth();

  return (
    <div className="min-h-screen bg-white">
      {/* Skip Links for Accessibility */}
      <div className="sr-only">
        {skipLinks.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="block bg-black text-white p-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegion}
      </div>

      {/* Header */}
      <Header 
        onMenuToggle={toggleSidebar}
        onSearchOpen={openSearchModal}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onClose={closeSidebar}
      />

      {/* Main content */}
      <main 
        id="main-content"
        className={cn(
          'pt-16 transition-all duration-300 min-h-[calc(100vh-4rem)]',
          // Responsive margin for sidebar
          'lg:ml-0',
          // Reduce motion for accessibility
          'reduce-motion:transition-none',
          className
        )}
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 
            ? `${sidebarWidth}px` 
            : undefined
        }}
        role="main"
        aria-label="Main content"
      >
        {/* Breadcrumbs */}
        {showBreadcrumbs && generatedBreadcrumbs.length > 0 && (
          <nav 
            className="border-b-2 border-gray-200 bg-gray-50"
            aria-label="Breadcrumb navigation"
          >
            <div className="px-4 py-3 sm:px-6 lg:px-8">
              <Breadcrumb items={generatedBreadcrumbs} />
            </div>
          </nav>
        )}

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Global search modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={closeSearchModal}
      />
    </div>
  );
};

export default Layout;