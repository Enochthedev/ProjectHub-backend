import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Breadcrumb, { useBreadcrumbs } from '../Breadcrumb';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
};

describe('Breadcrumb', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders breadcrumb items correctly', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
      { label: 'AI Project', isCurrentPage: true },
    ];

    render(<Breadcrumb items={items} />);
    
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('AI Project')).toBeInTheDocument();
  });

  it('shows home icon when showHome is true', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
    ];

    render(<Breadcrumb items={items} showHome={true} />);
    
    const homeButton = screen.getByLabelText('Go to dashboard');
    expect(homeButton).toBeInTheDocument();
  });

  it('handles navigation clicks', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
      { label: 'AI Project', isCurrentPage: true },
    ];

    render(<Breadcrumb items={items} />);
    
    const projectsLink = screen.getByText('Projects');
    fireEvent.click(projectsLink);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/projects');
  });

  it('handles home navigation', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
    ];

    render(<Breadcrumb items={items} />);
    
    const homeButton = screen.getByLabelText('Go to dashboard');
    fireEvent.click(homeButton);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('does not make current page clickable', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
      { label: 'AI Project', isCurrentPage: true },
    ];

    render(<Breadcrumb items={items} />);
    
    const currentPage = screen.getByText('AI Project');
    expect(currentPage.tagName).toBe('SPAN');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('renders without home when showHome is false', () => {
    const items = [
      { label: 'Projects', href: '/projects' },
    ];

    render(<Breadcrumb items={items} showHome={false} />);
    
    expect(screen.queryByLabelText('Go to dashboard')).not.toBeInTheDocument();
  });
});

describe('useBreadcrumbs', () => {
  it('generates breadcrumbs from pathname', () => {
    const TestComponent = ({ pathname }: { pathname: string }) => {
      const breadcrumbs = useBreadcrumbs(pathname);
      return (
        <div>
          {breadcrumbs.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      );
    };

    render(<TestComponent pathname="/projects/search" />);
    
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('uses custom items when provided', () => {
    const customItems = [
      { label: 'Custom', href: '/custom' },
      { label: 'Page', isCurrentPage: true },
    ];

    const TestComponent = () => {
      const breadcrumbs = useBreadcrumbs('/any/path', customItems);
      return (
        <div>
          {breadcrumbs.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
  });

  it('handles root path correctly', () => {
    const TestComponent = () => {
      const breadcrumbs = useBreadcrumbs('/dashboard');
      return (
        <div>
          {breadcrumbs.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});