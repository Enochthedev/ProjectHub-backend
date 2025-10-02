'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  className,
  showHome = true 
}) => {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const allItems = showHome 
    ? [{ label: 'Dashboard', href: '/dashboard' }, ...items]
    : items;

  return (
    <nav 
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isClickable = item.href && !item.isCurrentPage;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
              
              {index === 0 && showHome ? (
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="flex items-center text-gray-500 hover:text-black transition-colors"
                  aria-label="Go to dashboard"
                >
                  <Home className="h-4 w-4" />
                </button>
              ) : isClickable ? (
                <button
                  onClick={() => handleNavigation(item.href!)}
                  className={cn(
                    'text-gray-500 hover:text-black transition-colors',
                    'hover:underline focus:outline-none focus:underline'
                  )}
                >
                  {item.label}
                </button>
              ) : (
                <span 
                  className={cn(
                    isLast || item.isCurrentPage 
                      ? 'text-black font-medium' 
                      : 'text-gray-500'
                  )}
                  aria-current={isLast || item.isCurrentPage ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Hook to generate breadcrumbs from pathname
export const useBreadcrumbs = (pathname: string, customItems?: BreadcrumbItem[]) => {
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Route mappings for better labels
    const routeLabels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'projects': 'Projects',
      'bookmarks': 'Bookmarks',
      'ai-assistant': 'AI Assistant',
      'milestones': 'Milestones',
      'settings': 'Settings',
      'supervisor': 'Supervisor',
      'admin': 'Admin',
      'users': 'Users',
      'reports': 'Reports',
      'analytics': 'Analytics',
      'config': 'Configuration',
      'students': 'Students',
    };

    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Skip if this is a dynamic route parameter (starts with [)
      if (segment.startsWith('[')) return;
      
      breadcrumbs.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
        isCurrentPage: isLast,
      });
    });

    return breadcrumbs;
  };

  return generateBreadcrumbs();
};

export default Breadcrumb;