import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ProjectApproval from '../ProjectApproval';
import { useAdminStore } from '@/stores/admin';

// Mock the admin store
jest.mock('@/stores/admin');
const mockUseAdminStore = useAdminStore as jest.MockedFunction<typeof useAdminStore>;

const mockProjects = [
  {
    id: '1',
    title: 'AI-Powered Task Manager',
    abstract: 'A task management application using artificial intelligence to prioritize tasks.',
    specialization: 'Software Engineering',
    difficultyLevel: 'intermediate' as const,
    year: 2024,
    tags: ['AI', 'Task Management'],
    technologyStack: ['React', 'Node.js', 'Python'],
    isGroupProject: false,
    approvalStatus: 'pending' as const,
    githubUrl: 'https://github.com/example/project',
    demoUrl: 'https://demo.example.com',
    supervisor: {
      id: '1',
      name: 'Dr. John Smith',
      specializations: ['AI', 'Software Engineering'],
    },
    viewCount: 15,
    bookmarkCount: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockStoreState = {
  pendingProjects: mockProjects,
  selectedProjects: [],
  projectFilters: {},
  isLoading: false,
  error: null,
  fetchPendingProjects: jest.fn(),
  approveProject: jest.fn(),
  rejectProject: jest.fn(),
  setProjectFilters: jest.fn(),
  selectProjects: jest.fn(),
  bulkApproveProjects: jest.fn(),
  bulkRejectProjects: jest.fn(),
  clearError: jest.fn(),
  clearSelection: jest.fn(),
};

describe('ProjectApproval', () => {
  beforeEach(() => {
    mockUseAdminStore.mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders project approval interface', () => {
    render(<ProjectApproval />);
    
    expect(screen.getByText('Project Approval')).toBeInTheDocument();
    expect(screen.getByText('Review and approve pending project submissions.')).toBeInTheDocument();
  });

  it('displays pending projects', () => {
    render(<ProjectApproval />);
    
    expect(screen.getByText('AI-Powered Task Manager')).toBeInTheDocument();
    expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
  });

  it('calls fetchPendingProjects on mount', () => {
    render(<ProjectApproval />);
    
    expect(mockStoreState.fetchPendingProjects).toHaveBeenCalledTimes(1);
  });

  it('shows project technology stack', () => {
    render(<ProjectApproval />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('shows project links', () => {
    render(<ProjectApproval />);
    
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('handles project search', async () => {
    render(<ProjectApproval />);
    
    const searchInput = screen.getByPlaceholderText('Search projects by title, abstract, or technology...');
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    
    await waitFor(() => {
      expect(mockStoreState.setProjectFilters).toHaveBeenCalledWith({ search: 'AI' });
    }, { timeout: 500 });
  });

  it('opens project review modal when review button is clicked', () => {
    render(<ProjectApproval />);
    
    const reviewButton = screen.getByText('Review');
    fireEvent.click(reviewButton);
    
    expect(screen.getByText('Project Review')).toBeInTheDocument();
  });

  it('handles bulk project selection', () => {
    render(<ProjectApproval />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(mockStoreState.selectProjects).toHaveBeenCalledWith(['1']);
  });

  it('shows bulk actions when projects are selected', () => {
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      selectedProjects: ['1'],
    });

    render(<ProjectApproval />);
    
    expect(screen.getByText('1 project selected')).toBeInTheDocument();
    expect(screen.getByText('Approve All')).toBeInTheDocument();
    expect(screen.getByText('Reject All')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      isLoading: true,
    });

    render(<ProjectApproval />);
    
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load projects';
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      error: errorMessage,
    });

    render(<ProjectApproval />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state when no projects', () => {
    mockUseAdminStore.mockReturnValue({
      ...mockStoreState,
      pendingProjects: [],
    });

    render(<ProjectApproval />);
    
    expect(screen.getByText('No pending projects')).toBeInTheDocument();
    expect(screen.getByText('All projects have been reviewed or no projects match your filters.')).toBeInTheDocument();
  });

  it('handles specialization filter', () => {
    render(<ProjectApproval />);
    
    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Select specialization filter
    const specializationSelect = screen.getByDisplayValue('All Specializations');
    fireEvent.change(specializationSelect, { target: { value: 'Software Engineering' } });
    
    expect(mockStoreState.setProjectFilters).toHaveBeenCalledWith({ 
      specialization: 'Software Engineering' 
    });
  });

  it('clears filters when clear button is clicked', () => {
    render(<ProjectApproval />);
    
    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);
    
    // Click clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect(mockStoreState.setProjectFilters).toHaveBeenCalledWith({});
  });

  it('shows pending count badge', () => {
    render(<ProjectApproval />);
    
    expect(screen.getByText('1 Pending')).toBeInTheDocument();
  });
});