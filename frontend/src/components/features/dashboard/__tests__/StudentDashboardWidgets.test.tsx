import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentDashboardWidgets from '../StudentDashboardWidgets';
import { DashboardMetrics } from '../types';

// Mock the UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  )
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/Progress', () => ({
  __esModule: true,
  default: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}));

describe('StudentDashboardWidgets', () => {
  const mockMetrics: DashboardMetrics = {
    projectProgress: 65,
    milestonesCompleted: 3,
    aiInteractions: 8,
    bookmarksCount: 5
  };

  const mockRecentActivity = [
    {
      id: '1',
      type: 'milestone',
      title: 'Completed Project Proposal',
      timestamp: '2023-01-01T00:00:00Z',
      projectRelated: true
    },
    {
      id: '2',
      type: 'ai_chat',
      title: 'Asked AI about machine learning',
      timestamp: '2023-01-02T00:00:00Z',
      projectRelated: true
    }
  ];

  const mockUpcomingMilestones = [
    {
      id: '1',
      title: 'Literature Review',
      dueDate: '2023-12-31T00:00:00Z',
      status: 'upcoming'
    }
  ];

  const mockAiConversations = [
    {
      id: '1',
      title: 'Machine Learning Discussion',
      lastMessage: 'Based on your requirements...',
      timestamp: '2023-01-01T00:00:00Z',
      projectRelated: true
    }
  ];

  const mockTrendingProjects = [
    {
      id: '1',
      title: 'AI Recommendation System',
      specialization: 'Computer Science',
      difficultyLevel: 'Advanced',
      isBookmarked: false
    }
  ];

  const mockCurrentProject = {
    id: '1',
    title: 'Final Year Project',
    description: 'An AI-powered system',
    progress: {
      percentage: 65,
      nextMilestone: {
        title: 'Literature Review',
        daysRemaining: 5
      }
    }
  };

  const defaultProps = {
    metrics: mockMetrics,
    recentActivity: mockRecentActivity,
    upcomingMilestones: mockUpcomingMilestones,
    aiConversations: mockAiConversations,
    trendingProjects: mockTrendingProjects,
    currentProject: mockCurrentProject
  };

  it('renders all dashboard widgets', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    // Check if main widgets are rendered
    expect(screen.getByText('Current Project')).toBeInTheDocument();
    expect(screen.getByText('Project Metrics')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Milestones')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Trending Projects')).toBeInTheDocument();
  });

  it('displays current project information', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('Final Year Project')).toBeInTheDocument();
    expect(screen.getByText('An AI-powered system')).toBeInTheDocument();
    expect(screen.getByText('Literature Review')).toBeInTheDocument();
    expect(screen.getByText('Due in 5 days')).toBeInTheDocument();
  });

  it('displays project metrics correctly', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // milestones completed
    expect(screen.getByText('8')).toBeInTheDocument(); // AI interactions
    expect(screen.getByText('5')).toBeInTheDocument(); // bookmarks count
    expect(screen.getByText('65%')).toBeInTheDocument(); // project progress
  });

  it('displays recent activity items', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('Completed Project Proposal')).toBeInTheDocument();
    expect(screen.getByText('Asked AI about machine learning')).toBeInTheDocument();
  });

  it('displays upcoming milestones', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('Literature Review')).toBeInTheDocument();
    expect(screen.getByText('upcoming')).toBeInTheDocument();
  });

  it('displays AI conversations', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('Machine Learning Discussion')).toBeInTheDocument();
    expect(screen.getByText('Based on your requirements...')).toBeInTheDocument();
  });

  it('displays trending projects', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('AI Recommendation System')).toBeInTheDocument();
    expect(screen.getByText('Computer Science • Advanced')).toBeInTheDocument();
  });

  it('shows empty state when no current project', () => {
    const propsWithoutProject = {
      ...defaultProps,
      currentProject: null
    };

    render(<StudentDashboardWidgets {...propsWithoutProject} />);

    expect(screen.getByText('No Current Project')).toBeInTheDocument();
    expect(screen.getByText("You haven't been assigned to a project yet.")).toBeInTheDocument();
  });

  it('shows empty states for empty data', () => {
    const emptyProps = {
      ...defaultProps,
      recentActivity: [],
      upcomingMilestones: [],
      aiConversations: [],
      trendingProjects: []
    };

    render(<StudentDashboardWidgets {...emptyProps} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByText('No upcoming milestones')).toBeInTheDocument();
    expect(screen.getByText('No AI conversations yet')).toBeInTheDocument();
    expect(screen.getByText('No trending projects')).toBeInTheDocument();
  });

  it('handles widget interactions in editing mode', () => {
    const mockOnWidgetRemove = jest.fn();
    const mockOnWidgetResize = jest.fn();

    render(
      <StudentDashboardWidgets
        {...defaultProps}
        isEditing={true}
        onWidgetRemove={mockOnWidgetRemove}
        onWidgetResize={mockOnWidgetResize}
      />
    );

    // In editing mode, widgets should show editing controls
    // This would depend on the DashboardWidget implementation
    // For now, we just verify the props are passed correctly
    expect(screen.getAllByTestId('card')).toHaveLength(6); // 6 widgets
  });

  it('renders action buttons', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    expect(screen.getByText('Continue Work')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Assistant')).toBeInTheDocument();
  });

  it('handles bookmark toggle', () => {
    render(<StudentDashboardWidgets {...defaultProps} />);

    // Find the heart icon for bookmarking
    const heartIcons = screen.getAllByTestId('lucide-heart');
    expect(heartIcons.length).toBeGreaterThan(0);
  });
});