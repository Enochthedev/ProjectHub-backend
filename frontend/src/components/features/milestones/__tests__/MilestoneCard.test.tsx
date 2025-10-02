import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMilestoneStore } from '@/stores/milestone';
import MilestoneCard from '../MilestoneCard';
import { Milestone } from '@/types/milestone';

// Mock the store
jest.mock('@/stores/milestone');
const mockUseMilestoneStore = useMilestoneStore as jest.MockedFunction<typeof useMilestoneStore>;

const mockMilestone: Milestone = {
  id: 'milestone-1',
  title: 'Test Milestone',
  description: 'This is a test milestone for unit testing',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  status: 'in_progress',
  priority: 'high',
  progress: 75,
  studentId: 'student-1',
  supervisorId: 'supervisor-1',
  category: 'Development',
  tags: ['testing', 'frontend', 'react'],
  estimatedHours: 20,
  actualHours: 15,
  dependencies: [],
  attachments: [],
  notes: [],
  reminders: [],
  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockStoreState = {
  updateProgress: jest.fn(),
  isUpdating: false,
};

describe('MilestoneCard', () => {
  beforeEach(() => {
    mockUseMilestoneStore.mockReturnValue(mockStoreState);
    jest.clearAllMocks();
  });

  it('renders milestone information correctly', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    expect(screen.getByText('This is a test milestone for unit testing')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('shows estimated and actual hours', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    expect(screen.getByText('15/20h')).toBeInTheDocument();
  });

  it('displays due date correctly', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    expect(screen.getByText(/In \d+ days/)).toBeInTheDocument();
  });

  it('shows appropriate status icon', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    // Should show play icon for in_progress status
    const playIcon = document.querySelector('.lucide-play');
    expect(playIcon).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<MilestoneCard milestone={mockMilestone} onEdit={mockOnEdit} />);

    // Find the more options button by its icon
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-ellipsis"]')
    );
    
    expect(moreButton).toBeTruthy();
    fireEvent.click(moreButton!);

    // Click edit option
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockMilestone);
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    render(<MilestoneCard milestone={mockMilestone} onDelete={mockOnDelete} />);

    // Find the more options button by its icon
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-ellipsis"]')
    );
    
    expect(moreButton).toBeTruthy();
    fireEvent.click(moreButton!);

    // Click delete option
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('milestone-1');
  });

  it('calls onViewDetails when view details button is clicked', () => {
    const mockOnViewDetails = jest.fn();
    render(<MilestoneCard milestone={mockMilestone} onViewDetails={mockOnViewDetails} />);

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockMilestone);
  });

  it('updates progress when progress bar is clicked', async () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    const progressBar = document.querySelector('.cursor-pointer');
    expect(progressBar).toBeInTheDocument();

    // Mock getBoundingClientRect
    const mockGetBoundingClientRect = jest.fn(() => ({
      left: 0,
      width: 100,
      top: 0,
      right: 100,
      bottom: 10,
      height: 10,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));
    
    if (progressBar) {
      progressBar.getBoundingClientRect = mockGetBoundingClientRect;
      
      // Simulate click at 50% position
      fireEvent.click(progressBar, { clientX: 50 });

      await waitFor(() => {
        expect(mockStoreState.updateProgress).toHaveBeenCalledWith('milestone-1', {
          progress: 50,
          status: 'in_progress',
        });
      });
    }
  });

  it('shows complete button for in_progress milestones', () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows start button for not_started milestones', () => {
    const notStartedMilestone = { ...mockMilestone, status: 'not_started' as const };
    render(<MilestoneCard milestone={notStartedMilestone} />);

    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('shows reopen button for completed milestones', () => {
    const completedMilestone = { ...mockMilestone, status: 'completed' as const };
    render(<MilestoneCard milestone={completedMilestone} />);

    expect(screen.getByText('Reopen')).toBeInTheDocument();
  });

  it('updates status when action buttons are clicked', async () => {
    render(<MilestoneCard milestone={mockMilestone} />);

    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockStoreState.updateProgress).toHaveBeenCalledWith('milestone-1', {
        status: 'completed',
        progress: 100,
      });
    });
  });

  it('renders in compact mode', () => {
    render(<MilestoneCard milestone={mockMilestone} compact />);

    // In compact mode, should not show detailed description
    expect(screen.queryByText('This is a test milestone for unit testing')).not.toBeInTheDocument();
    
    // But should still show basic info
    expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('shows overdue badge for overdue milestones', () => {
    const overdueMilestone = {
      ...mockMilestone,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      status: 'in_progress' as const,
    };
    
    render(<MilestoneCard milestone={overdueMilestone} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows only first 3 tags with overflow indicator', () => {
    const milestoneWithManyTags = {
      ...mockMilestone,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    
    render(<MilestoneCard milestone={milestoneWithManyTags} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('disables buttons when updating', () => {
    mockUseMilestoneStore.mockReturnValue({
      ...mockStoreState,
      isUpdating: true,
    });

    render(<MilestoneCard milestone={mockMilestone} />);

    const completeButton = screen.getByText('Complete');
    expect(completeButton).toBeDisabled();
  });

  it('applies correct priority colors', () => {
    const { rerender } = render(<MilestoneCard milestone={mockMilestone} />);

    // High priority should have specific styling
    let priorityBadge = screen.getByText('high');
    expect(priorityBadge).toHaveClass('bg-gray-700', 'text-white');

    // Test critical priority
    const criticalMilestone = { ...mockMilestone, priority: 'critical' as const };
    rerender(<MilestoneCard milestone={criticalMilestone} />);

    priorityBadge = screen.getByText('critical');
    expect(priorityBadge).toHaveClass('bg-gray-900', 'text-white');
  });

  it('applies correct status colors', () => {
    const { rerender } = render(<MilestoneCard milestone={mockMilestone} />);

    // In progress should have specific styling
    let statusBadge = screen.getByText('in progress');
    expect(statusBadge).toHaveClass('bg-gray-700', 'text-white');

    // Test completed status
    const completedMilestone = { ...mockMilestone, status: 'completed' as const };
    rerender(<MilestoneCard milestone={completedMilestone} />);

    statusBadge = screen.getByText('completed');
    expect(statusBadge).toHaveClass('bg-gray-900', 'text-white');
  });
});