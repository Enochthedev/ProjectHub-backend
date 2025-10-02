import React from 'react';
import { render, screen } from '@testing-library/react';
import SupervisorAIAssistantPage from '../page';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Brain: ({ className }: { className?: string }) => <div data-testid="brain-icon" className={className} />,
  MessageSquare: ({ className }: { className?: string }) => <div data-testid="message-square-icon" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up-icon" className={className} />,
  Users: ({ className }: { className?: string }) => <div data-testid="users-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-circle-icon" className={className} />,
}));

describe('SupervisorAIAssistantPage', () => {
  it('renders the page title and description', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('AI-powered tools and insights for supervision and project management')).toBeInTheDocument();
  });

  it('renders the stats cards', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getByText('AI Interactions')).toBeInTheDocument();
    expect(screen.getByText('127')).toBeInTheDocument();
    
    expect(screen.getByText('Insights Generated')).toBeInTheDocument();
    expect(screen.getByText('43')).toBeInTheDocument();
    
    expect(screen.getByText('Students Assisted')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the AI chat interface', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getByText('AI Assistant Chat')).toBeInTheDocument();
    expect(screen.getByText('Get AI-powered insights about your students and projects')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask about student progress, project insights, or supervision tips...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('renders recent AI insights', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getByText('Recent AI Insights')).toBeInTheDocument();
    expect(screen.getByText('Student Progress Alert')).toBeInTheDocument();
    expect(screen.getByText('Collaboration Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Resource Recommendation')).toBeInTheDocument();
  });

  it('renders AI-powered supervision tools', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getByText('AI-Powered Supervision Tools')).toBeInTheDocument();
    expect(screen.getByText('Progress Analysis')).toBeInTheDocument();
    expect(screen.getByText('Feedback Generator')).toBeInTheDocument();
    expect(screen.getByText('Meeting Scheduler')).toBeInTheDocument();
  });

  it('renders all required icons', () => {
    render(<SupervisorAIAssistantPage />);
    
    expect(screen.getAllByTestId('brain-icon')).toHaveLength(3); // One in chat interface, one in insights, one in tools
    expect(screen.getAllByTestId('message-square-icon')).toHaveLength(2); // One in stats, one in tools
    expect(screen.getAllByTestId('trending-up-icon')).toHaveLength(3); // One in stats, one in insights, one in tools
    expect(screen.getAllByTestId('users-icon')).toHaveLength(3); // One in stats, one in insights, one in tools
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
  });
});