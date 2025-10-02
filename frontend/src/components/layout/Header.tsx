'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useResponsive, useTouchDevice } from '@/hooks/useResponsive';
import { useFocusTrap } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NotificationCenter } from '@/components/features/notifications/NotificationCenter';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
  onSearchOpen: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  onSearchOpen, 
  className 
}) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isMobile, isTablet } = useResponsive();
  const isTouchDevice = useTouchDevice();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Focus trap for user menu
  const focusTrapRef = useFocusTrap(showUserMenu);

  // Close user menu on escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUserMenu) {
        setShowUserMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    switch (user.role) {
      case 'student':
        const studentProfile = user.profile as any;
        if (studentProfile?.firstName && studentProfile?.lastName) {
          return `${studentProfile.firstName} ${studentProfile.lastName}`;
        }
        return user.name || user.email || 'Student';
      case 'supervisor':
      case 'admin':
        const profile = user.profile as any;
        if (profile?.name) {
          return profile.name;
        }
        return user.name || user.email || 'User';
      default:
        return user.name || user.email || 'User';
    }
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header 
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b-2 border-gray-200',
        className
      )}
      role="banner"
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left section - Logo and mobile menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className={cn(
              'lg:hidden',
              // Touch-friendly sizing
              isTouchDevice && 'min-h-touch min-w-touch'
            )}
            aria-label="Toggle navigation menu"
            aria-expanded={false} // This should be managed by the sidebar state
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <button 
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-sm"
            onClick={() => router.push('/dashboard')}
            aria-label="ProjectHub - Go to dashboard"
          >
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm" aria-hidden="true">PH</span>
            </div>
            <span className="font-semibold text-lg text-black hidden sm:block">
              ProjectHub
            </span>
          </button>
        </div>

        {/* Center section - Search bar (desktop only) */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <form onSubmit={handleSearch} className="relative" role="search">
            <Input
              id="search"
              type="search"
              placeholder="Search projects... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              aria-label="Search projects"
            />
            <button
              type="button"
              onClick={onSearchOpen}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-sm"
              aria-label="Open advanced search modal"
            >
              <Search className="h-4 w-4" />
            </button>
            <div 
              className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-gray-400 hidden lg:block pointer-events-none"
              aria-hidden="true"
            >
              ⌘K
            </div>
          </form>
        </div>

        {/* Right section - Search button (mobile), notifications, and user menu */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchOpen}
            className={cn(
              'md:hidden',
              isTouchDevice && 'min-h-touch min-w-touch'
            )}
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'flex items-center space-x-2 p-2 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-sm',
                // Touch-friendly sizing
                isTouchDevice && 'min-h-touch',
                // Active state
                showUserMenu && 'bg-gray-50 border-gray-200'
              )}
              aria-label={`User menu for ${getUserDisplayName()}`}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                {getUserInitials()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-black max-w-32 truncate">
                {getUserDisplayName()}
              </span>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <>
                {/* Backdrop for mobile */}
                <div 
                  className="fixed inset-0 z-10 md:hidden"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                
                {/* Menu */}
                <div 
                  ref={focusTrapRef}
                  className={cn(
                    'absolute right-0 top-full mt-2 bg-white border-2 border-black shadow-brutal z-20',
                    // Responsive width
                    isMobile ? 'w-56' : 'w-48'
                  )}
                  role="menu"
                  aria-labelledby="user-menu-button"
                >
                  <div className="p-3 border-b-2 border-gray-200">
                    <p className="text-sm font-medium text-black truncate">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                  </div>
                  
                  <div className="py-1" role="none">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/profile');
                      }}
                      className={cn(
                        'flex items-center w-full px-3 py-2 text-sm text-black hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
                        // Touch-friendly sizing
                        isTouchDevice && 'min-h-touch'
                      )}
                      role="menuitem"
                    >
                      <User className="h-4 w-4 mr-3 flex-shrink-0" />
                      Profile
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/settings');
                      }}
                      className={cn(
                        'flex items-center w-full px-3 py-2 text-sm text-black hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
                        isTouchDevice && 'min-h-touch'
                      )}
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 mr-3 flex-shrink-0" />
                      Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className={cn(
                        'flex items-center w-full px-3 py-2 text-sm text-black hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
                        isTouchDevice && 'min-h-touch'
                      )}
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;