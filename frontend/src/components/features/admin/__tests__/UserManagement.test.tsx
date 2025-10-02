import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import UserManagement from '../UserManagement';
import { useAdminStore } from '@/stores/admin';

// Mock the admin store
jest.mock('@/stores/admin');
const mockUseAdminStore = useAdminStore as jest.MockedFunction<typeof useAdminStore>;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockUsers = [
  {
    id: '1',
    email: 'student@test.com',
    role: 'student' as const,
    isEmailVerified: true,
    isActive: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      studentId: 'S123456',
      specialization: 'Software Engineering',
      year: 3,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'supervisor@test.com',
    role: 'supervisor' as const,
    isEmailVerified: true,
    isActive: true,
    profile: {
      name: 'Dr. Jane Smith',
      specializations: ['Software Engineering', 'AI'],
      isAvailable: true,
      capacity: 10,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockStoreState = {
  users: mockUsers,
  selectedUsers: [],
  userFilters: {},
  isLoading: false,
  error: null,
  fetchUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  toggleUserStatus: jest.fn(),
  setUserFilters: jest.fn(),
  selectUsers: jest.fn(),
  bulkUpdateUsers: jest.fn(),
  clearError: jest.fn(),
  clearSelection: jest.fn(),
};

describe('UserManagement', () => {
  beforeEach(() => {
    mockUseAdminStore.mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders user management interface', () => {
    render(<UserManagement />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage users, roles, and permissions across the platform.')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  it('displays users in table', () => {
    render(<UserManagement />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('student@test.com')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('supervisor@test.com')).toBeInTheDocument();
  });

  it('calls fetchUsers on mount', () => {
    render(<UserManagement />);
    
    expect(mockStoreState.fetchUsers).toHaveBeenCalledTimes(1);
  });

  it('opens create user modal when add user button is clicked', () => {
    render(<UserManagement />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Create New User')).toBeInTheDocument();
  });

  it('filters users by search query', async () => {
    render(<UserManagement />);
    
    const searchInput = screen.getByPlaceholderText('Search users by name, email, or student ID...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    await waitFor(() => {
      expect(mockStoreState.setUserFilters).toHaveBeenCalledWith({ search: 'john' });
    }, { timeout: 500 });
  });

  it('shows loading state', () => {
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      isLoading: true,
    });

    render(<UserManagement />);
    
    expect(screen.getAllByTestId('skeleton')).toHaveLength(5);
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load users';
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      error: errorMessage,
    });

    render(<UserManagement />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles bulk user selection', () => {
    render(<UserManagement />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(mockStoreState.selectUsers).toHaveBeenCalledWith(['1', '2']);
  });

  it('shows bulk actions when users are selected', () => {
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      selectedUsers: ['1'],
    });

    render(<UserManagement />);
    
    expect(screen.getByText('1 user selected')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('handles user role filter', () => {
    render(<UserManagement />);
    
    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Select role filter
    const roleSelect = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleSelect, { target: { value: 'student' } });
    
    expect(mockStoreState.setUserFilters).toHaveBeenCalledWith({ role: 'student' });
  });

  it('handles user status filter', () => {
    render(<UserManagement />);
    
    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Select status filter
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    
    expect(mockStoreState.setUserFilters).toHaveBeenCalledWith({ status: 'active' });
  });

  it('clears filters when clear button is clicked', () => {
    render(<UserManagement />);
    
    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Click clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect(mockStoreState.setUserFilters).toHaveBeenCalledWith({});
  });
});