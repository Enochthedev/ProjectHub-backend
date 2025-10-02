import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSearch } from '../ProjectSearch';

// Mock the store
const mockSetSearchParams = jest.fn();
const mockClearSearchParams = jest.fn();

jest.mock('@/stores/project', () => ({
  useProjectStore: () => ({
    searchParams: { query: '', page: 1, limit: 12 },
    setSearchParams: mockSetSearchParams,
    clearSearchParams: mockClearSearchParams,
  }),
  useSearchParamsWithFilters: () => ({
    query: '',
    page: 1,
    limit: 12,
  }),
  useHasActiveFilters: () => false,
}));

// Mock the debounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('ProjectSearch', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByPlaceholderText(/search projects, technologies, or keywords/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('updates search params when typing', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Should call setSearchParams with the query and reset page to 1
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({ query: 'react', page: 1 });
    });
  });

  it('shows search suggestions when typing', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Should show suggestions dropdown
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('handles suggestion selection', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // Click on a suggestion
    const suggestion = screen.getByText('React');
    await user.click(suggestion);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ query: 'React', page: 1 });
  });

  it('handles keyboard navigation in suggestions', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // Navigate with arrow keys
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  it('clears search when clear button is clicked', async () => {
    // Mock store with existing query
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      searchParams: { query: 'test query', page: 1, limit: 12 },
      setSearchParams: mockSetSearchParams,
      clearSearchParams: mockClearSearchParams,
    });

    render(<ProjectSearch />);

    // Should show clear button when there's a query
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(mockClearSearchParams).toHaveBeenCalled();
  });

  it('shows filters toggle button', () => {
    const onToggleFilters = jest.fn();
    render(<ProjectSearch onToggleFilters={onToggleFilters} />);

    const filtersButton = screen.getByRole('button', { name: /filter/i });
    expect(filtersButton).toBeInTheDocument();

    fireEvent.click(filtersButton);
    expect(onToggleFilters).toHaveBeenCalled();
  });

  it('hides filters toggle when showFiltersToggle is false', () => {
    render(<ProjectSearch showFiltersToggle={false} />);

    const filtersButton = screen.queryByRole('button', { name: /filter/i });
    expect(filtersButton).not.toBeInTheDocument();
  });

  it('closes suggestions when clicking outside', async () => {
    render(
      <div>
        <ProjectSearch />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // Click outside
    const outsideElement = screen.getByTestId('outside');
    await user.click(outsideElement);

    // Suggestions should be hidden
    await waitFor(() => {
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });
  });

  it('closes suggestions when pressing Escape', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    // Suggestions should be hidden
    await waitFor(() => {
      expect(screen.queryByText('React')).not.toBeInTheDocument();
    });
  });

  it('shows loading indicator when searching', async () => {
    render(<ProjectSearch />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'react');

    // Should show loading spinner briefly (check for spinner icon)
    const spinnerIcon = screen.getByRole('textbox').parentElement?.querySelector('.animate-spin');
    expect(spinnerIcon).toBeInTheDocument();
  });

  it('displays keyboard shortcuts hint', () => {
    render(<ProjectSearch />);

    expect(screen.getByText(/↑↓/)).toBeInTheDocument();
    expect(screen.getByText(/Enter/)).toBeInTheDocument();
    expect(screen.getByText(/Esc/)).toBeInTheDocument();
  });

  it('shows active search summary when there are filters', () => {
    // Mock store with active filters
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      searchParams: { query: 'test', page: 1, limit: 12 },
      setSearchParams: mockSetSearchParams,
      clearSearchParams: mockClearSearchParams,
    });

    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectSearch />);

    expect(screen.getByText('Searching for:')).toBeInTheDocument();
    expect(screen.getByText('"test"')).toBeInTheDocument();
    expect(screen.getByText('+ filters applied')).toBeInTheDocument();
  });

  it('uses custom placeholder when provided', () => {
    const customPlaceholder = 'Custom search placeholder';
    render(<ProjectSearch placeholder={customPlaceholder} />);

    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });
});