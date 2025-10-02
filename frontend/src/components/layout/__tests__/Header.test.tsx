import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import Header from '../Header';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'student' as const,
  profile: {
    firstName: 'John',
    lastName: 'Doe',
  },
};

const mockProps = {
  onMenuToggle: jest.fn(),
  onSearchOpen: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
    });
    jest.clearAllMocks();
  });

  it('renders header with logo and user menu', () => {
    render(<Header {...mockProps} />);
    
    expect(screen.getByText('ProjectHub')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows mobile menu button on mobile', () => {
    render(<Header {...mockProps} />);
    
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    expect(menuButton).toBeInTheDocument();
    
    fireEvent.click(menuButton);
    expect(mockProps.onMenuToggle).toHaveBeenCalled();
  });

  it('handles search functionality', () => {
    render(<Header {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search projects/);
    const searchButton = screen.getByLabelText('Open search modal');
    
    expect(searchInput).toBeInTheDocument();
    
    fireEvent.click(searchButton);
    expect(mockProps.onSearchOpen).toHaveBeenCalled();
  });

  it('handles search form submission', () => {
    render(<Header {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search projects/);
    
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.submit(searchInput.closest('form')!);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/search?q=test%20query');
  });

  it('shows user dropdown menu when clicked', async () => {
    render(<Header {...mockProps} />);
    
    const userButton = screen.getByLabelText('User menu');
    fireEvent.click(userButton);
    
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('handles logout functionality', async () => {
    const mockLogout = jest.fn();
    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    render(<Header {...mockProps} />);
    
    const userButton = screen.getByLabelText('User menu');
    fireEvent.click(userButton);
    
    await waitFor(() => {
      const logoutButton = screen.getByText('Sign out');
      fireEvent.click(logoutButton);
    });
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('navigates to dashboard when logo is clicked', () => {
    render(<Header {...mockProps} />);
    
    const logo = screen.getByText('ProjectHub').closest('div');
    fireEvent.click(logo!);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('displays correct user initials for different user types', () => {
    // Test supervisor user
    const supervisorUser = {
      ...mockUser,
      role: 'supervisor' as const,
      profile: { name: 'Jane Smith' },
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: supervisorUser,
      logout: jest.fn(),
    });

    render(<Header {...mockProps} />);
    
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});