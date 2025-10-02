import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SupervisorProjectsPage from '../projects/page';
import { supervisorApi } from '@/lib/supervisor-api';
import { useAuthStore } from '@/stores/auth';

// Mock the dependencies
jest.mock('@/lib/supervisor-api');
jest.mock('@/stores/auth', () => ({
  useAuthStore: jest.fn()
}));
jest.mock('@/stores/project');

const mockSupervisorApi = supervisorApi as jest.Mocked<typeof supervisorApi>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const mockProjects = [
  {
    id: 'project-1',
    title: 'Machine Learning for Healthcare',
    abstract: 'Developing ML models for medical diagnosis',
    specialization: 'Machine Learning',
    difficultyLevel: 'advanced' as const,
    year: 2024,
    tags: ['ML', 'Healthcare', 'AI'],
    technologyStack: ['Python', 'TensorFlow', 'React'],
    isGroupProject: false,
    approvalStatus: 'approved' as const,
    githubUrl: 'https://github.com/example/ml-healthcare',
    demoUrl: 'https://demo.example.com',
    supervisor: {
      id: 'supervisor-1',
      name: 'Dr. Smith',
      specializations: ['Machine Learning', 'AI']
    },
    viewCount: 150,
    bookmarkCount: 25,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z'
  },
  {
    id: 'project-2',
    title: 'Web Development Framework',
    abstract: 'Building a modern web framework',
    specialization: 'Software Engineering',
    difficultyLevel: 'intermediate' as const,
    year: 2024,
    tags: ['Web', 'Framework', 'JavaScript'],
    technologyStack: ['JavaScript', 'Node.js', 'Express'],
    isGroupProject: true,
    approvalStatus: 'pending' as const,
    supervisor: {
      id: 'supervisor-1',
      name: 'Dr. Smith',
      specializations: ['Software Engineering']
    },
    viewCount: 75,
    bookmarkCount: 12,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-03-10T10:00:00Z'
  }
];

const mockUser = {
  id: 'supervisor-1',
  email: 'supervisor@example.com',
  role: 'supervisor' as const,
  isEmailVerified: true,
  isActive: true,
  profile: {
    id: 'profile-1',
    name: 'Dr. Smith',
    specializations: ['Machine Learning', 'Software Engineering'],
    isAvailable: true,
    capacity: 5,
    profileUpdatedAt: '2024-01-01T00:00:00Z'
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('SupervisorProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateProfile: jest.fn(),
      clearError: jest.fn()
    });
  });

  it('should render loading state initially', () => {
    mockSupervisorApi.getSupervisorProjects.mockImplementation(() => new Promise(() => {}));

    render(<SupervisorProjectsPage />);

    expect(screen.getByText('My Projects')).toBeInTheDocument();
    // Check for skeleton loaders
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
  });

  it('should render projects after loading', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Web Development Framework')).toBeInTheDocument();
    });

    // Check project details
    expect(screen.getByText('Developing ML models for medical diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Building a modern web framework')).toBeInTheDocument();
    
    // Check status badges
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    // Check technology stacks
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('should handle API error', async () => {
    const errorMessage = 'Failed to load projects';
    mockSupervisorApi.getSupervisorProjects.mockRejectedValue(new Error(errorMessage));

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should filter projects by search query', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Search for "machine learning"
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
      expect(screen.queryByText('Web Development Framework')).not.toBeInTheDocument();
    });
  });

  it('should filter projects by status', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Web Development Framework')).toBeInTheDocument();
    });

    // Filter by pending status
    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'pending' } });

    await waitFor(() => {
      expect(screen.queryByText('Machine Learning for Healthcare')).not.toBeInTheDocument();
      expect(screen.getByText('Web Development Framework')).toBeInTheDocument();
    });
  });

  it('should show empty state when no projects match filters', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent project' } });

    await waitFor(() => {
      expect(screen.getByText('No Projects Found')).toBeInTheDocument();
      expect(screen.getByText('No projects match your current filters.')).toBeInTheDocument();
    });
  });

  it('should show empty state when no projects exist', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue([]);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('No Projects Found')).toBeInTheDocument();
      expect(screen.getByText('You haven\'t created any projects yet.')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Project')).toBeInTheDocument();
    });
  });

  it('should open create project modal', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Click create project button
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByText('Project creation form will be implemented here.')).toBeInTheDocument();
    });
  });

  it('should close create project modal', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  it('should display correct project statistics', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Check view counts
    expect(screen.getByText('150')).toBeInTheDocument(); // First project views
    expect(screen.getByText('75')).toBeInTheDocument();  // Second project views
    
    // Check bookmark counts
    expect(screen.getByText('25')).toBeInTheDocument(); // First project bookmarks
    expect(screen.getByText('12')).toBeInTheDocument(); // Second project bookmarks
  });

  it('should display technology stack with truncation', async () => {
    const projectWithManyTechs = {
      ...mockProjects[0],
      technologyStack: ['Python', 'TensorFlow', 'React', 'Node.js', 'MongoDB', 'Docker']
    };
    
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue([projectWithManyTechs]);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });

    // Should show first 3 technologies and "+3 more"
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('TensorFlow')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('should handle retry after error', async () => {
    // First call fails, second succeeds
    mockSupervisorApi.getSupervisorProjects
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Machine Learning for Healthcare')).toBeInTheDocument();
    });
  });

  it('should display correct status colors and icons', async () => {
    mockSupervisorApi.getSupervisorProjects.mockResolvedValue(mockProjects);

    render(<SupervisorProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    // Check that status badges have correct styling
    const approvedBadge = screen.getByText('Approved').closest('div');
    const pendingBadge = screen.getByText('Pending').closest('div');
    
    expect(approvedBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
});