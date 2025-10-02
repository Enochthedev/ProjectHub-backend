'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Bookmark, 
  MessageSquare, 
  Target, 
  Users, 
  Settings, 
  BarChart3,
  FolderOpen,
  UserCheck,
  Shield,
  Database,
  ChevronLeft,
  ChevronRight,
  FileText,
  Brain,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: ('student' | 'supervisor' | 'admin')[];
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  // Common items
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/dashboard',
    roles: ['student', 'supervisor', 'admin'],
  },
  
  // Student items
  {
    id: 'discover',
    label: 'Discover Projects',
    icon: Search,
    href: '/projects',
    roles: ['student'],
  },
  {
    id: 'supervisors',
    label: 'Find Supervisors',
    icon: Users,
    href: '/student/supervisors',
    roles: ['student'],
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: Bookmark,
    href: '/bookmarks',
    roles: ['student'],
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    icon: MessageSquare,
    href: '/ai-assistant',
    roles: ['student'],
  },
  {
    id: 'milestones',
    label: 'Milestones',
    icon: Target,
    href: '/milestones',
    roles: ['student'],
  },
  
  // Supervisor items
  {
    id: 'my-projects',
    label: 'My Projects',
    icon: FolderOpen,
    href: '/supervisor/projects',
    roles: ['supervisor'],
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    href: '/supervisor/students',
    roles: ['supervisor'],
  },
  {
    id: 'student-requests',
    label: 'Student Requests',
    icon: UserCheck,
    href: '/supervisor/requests',
    roles: ['supervisor'],
  },
  {
    id: 'supervisor-milestones',
    label: 'Milestone Review',
    icon: Target,
    href: '/supervisor/milestones',
    roles: ['supervisor'],
  },
  {
    id: 'supervisor-ai-assistant',
    label: 'AI Assistant',
    icon: MessageSquare,
    href: '/supervisor/ai-assistant',
    roles: ['supervisor'],
  },

  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    href: '/supervisor/reports',
    roles: ['supervisor'],
  },
  {
    id: 'supervisor-analytics',
    label: 'Analytics',
    icon: TrendingUp,
    href: '/supervisor/analytics',
    roles: ['supervisor'],
  },
  {
    id: 'availability',
    label: 'Availability',
    icon: Clock,
    href: '/supervisor/availability',
    roles: ['supervisor'],
  },
  
  // Admin items
  {
    id: 'user-management',
    label: 'User Management',
    icon: UserCheck,
    href: '/admin/users',
    roles: ['admin'],
  },
  {
    id: 'project-approval',
    label: 'Project Approval',
    icon: Shield,
    href: '/admin/projects',
    roles: ['admin'],
  },
  {
    id: 'ai-management',
    label: 'AI Management',
    icon: Brain,
    href: '/admin/ai',
    roles: ['admin'],
  },
  {
    id: 'admin-analytics',
    label: 'Platform Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
    roles: ['admin'],
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: Database,
    href: '/admin/system',
    roles: ['admin'],
  },
  {
    id: 'bulk-operations',
    label: 'Bulk Operations',
    icon: Database,
    href: '/admin/bulk-operations',
    roles: ['admin'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Settings,
    href: '/admin/maintenance',
    roles: ['admin'],
  },
  
  // Settings (all roles)
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    roles: ['student', 'supervisor', 'admin'],
  },
];

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onClose,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredItems = navigationItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleNavigation = (href: string) => {
    router.push(href);
    // Close mobile sidebar after navigation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        id="navigation"
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-gray-50 border-r-2 border-gray-200 transition-all duration-300',
          'reduce-motion:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64',
          className
        )}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!isOpen && typeof window !== 'undefined' && window.innerWidth < 1024}
      >
        <div className="flex flex-col h-full">
          {/* Collapse toggle button (desktop only) */}
          <div className="hidden lg:flex justify-end p-2 border-b-2 border-gray-200">
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-sm"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto" role="menu">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-sm',
                    'reduce-motion:transition-none',
                    // Touch-friendly sizing
                    'min-h-touch',
                    isActive
                      ? 'bg-gray-100 text-black border-l-black border-r-transparent border-t-transparent border-b-transparent'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-black border-transparent',
                    isCollapsed ? 'justify-center' : 'justify-start'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  role="menuitem"
                >
                  <Icon 
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isCollapsed && 'mr-3'
                    )}
                    aria-hidden="true"
                  />
                  
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  
                  {!isCollapsed && item.badge && (
                    <span 
                      className="ml-auto bg-black text-white text-xs px-2 py-1 rounded-sm"
                      aria-label={`${item.badge} notifications`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User info (when expanded) */}
          {!isCollapsed && user && (
            <div className="p-3 border-t-2 border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium"
                  aria-hidden="true"
                >
                  {(() => {
                    if (user.role === 'student') {
                      const profile = user.profile as any;
                      if (profile?.firstName && profile?.lastName) {
                        return `${profile.firstName[0]}${profile.lastName[0]}`;
                      }
                    } else {
                      const profile = user.profile as any;
                      if (profile?.name) {
                        return profile.name[0];
                      }
                    }
                    return (user.name || user.email || 'U')[0].toUpperCase();
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">
                    {(() => {
                      if (user.role === 'student') {
                        const profile = user.profile as any;
                        if (profile?.firstName && profile?.lastName) {
                          return `${profile.firstName} ${profile.lastName}`;
                        }
                      } else {
                        const profile = user.profile as any;
                        if (profile?.name) {
                          return profile.name;
                        }
                      }
                      return user.name || user.email || 'User';
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;