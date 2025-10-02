import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import GlobalSearchModal from '../GlobalSearchModal';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('GlobalSearchModal', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders search modal when open', () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    expect(screen.getByPlaceholderText(/Search projects/)).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<GlobalSearchModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByPlaceholderText(/Search projects/)).not.toBeInTheDocument();
  });

  it('focuses input when modal opens', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('shows search results when typing', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'AI' } });
    
    await waitFor(() => {
      expect(screen.getByText('AI-Powered Recommendation System')).toBeInTheDocument();
    });
  });

  it('shows no results message for empty search', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText(/No results found/)).toBeInTheDocument();
    });
  });

  it('handles result selection', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'AI' } });
    
    await waitFor(() => {
      const result = screen.getByText('AI-Powered Recommendation System');
      fireEvent.click(result);
    });
    
    expect(mockRouter.push).toHaveBeenCalledWith('/projects/1');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'AI' } });
    
    await waitFor(() => {
      expect(screen.getByText('AI-Powered Recommendation System')).toBeInTheDocument();
    });
    
    // Test arrow down
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    
    // Test enter to select
    fireEvent.keyDown(document, { key: 'Enter' });
    
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it('handles escape key to close', () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows recent searches when available', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['previous search']));
    
    render(<GlobalSearchModal {...mockProps} />);
    
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
    expect(screen.getByText('previous search')).toBeInTheDocument();
  });

  it('handles recent search selection', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['AI projects']));
    
    render(<GlobalSearchModal {...mockProps} />);
    
    const recentSearch = screen.getByText('AI projects');
    fireEvent.click(recentSearch);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    expect(input).toHaveValue('AI projects');
  });

  it('handles quick actions', () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const browseProjectsAction = screen.getByText('Browse all projects');
    fireEvent.click(browseProjectsAction);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/projects');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('saves search to recent searches on result selection', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'AI' } });
    
    await waitFor(() => {
      const result = screen.getByText('AI-Powered Recommendation System');
      fireEvent.click(result);
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'recent-searches',
      JSON.stringify(['AI'])
    );
  });

  it('displays result metadata correctly', async () => {
    render(<GlobalSearchModal {...mockProps} />);
    
    const input = screen.getByPlaceholderText(/Search projects/);
    fireEvent.change(input, { target: { value: 'AI' } });
    
    await waitFor(() => {
      expect(screen.getAllByText('Project')).toHaveLength(2); // Two project results
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });
});