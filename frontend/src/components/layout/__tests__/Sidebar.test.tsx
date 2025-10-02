import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '../Sidebar';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockProps = {
  isOpen: true,
  isCollapsed: false,
  onToggleCollapse: jest.fn(),
  onClose: jest.fn(),
};

describe('Sidebar', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    jest.clearAllMocks();
  });

  it('renders student navigation items', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders supervisor navigation items', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'supervisor',
        profile: { name: 'Dr. Smith' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('AI Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders admin navigation items', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'admin',
        profile: { name: 'Admin User' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Project Approval')).toBeInTheDocument();
    expect(screen.getByText('System Config')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    (usePathname as jest.Mock).mockReturnValue('/projects');
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    const projectsButton = screen.getByText('Discover Projects').closest('button');
    expect(projectsButton).toHaveClass('bg-gray-100');
  });

  it('handles navigation clicks', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    const projectsButton = screen.getByText('Discover Projects');
    fireEvent.click(projectsButton);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/projects');
  });

  it('handles collapse toggle', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    const collapseButton = screen.getByLabelText('Collapse sidebar');
    fireEvent.click(collapseButton);
    
    expect(mockProps.onToggleCollapse).toHaveBeenCalled();
  });

  it('shows collapsed state correctly', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} isCollapsed={true} />);
    
    // In collapsed state, buttons should have title attributes instead of visible text
    const dashboardButton = screen.getByTitle('Dashboard');
    expect(dashboardButton).toBeInTheDocument();
  });

  it('shows user info when expanded', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    render(<Sidebar {...mockProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
  });

  it('handles mobile backdrop click', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    });

    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<Sidebar {...mockProps} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.z-30');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockProps.onClose).toHaveBeenCalled();
    }
  });
});