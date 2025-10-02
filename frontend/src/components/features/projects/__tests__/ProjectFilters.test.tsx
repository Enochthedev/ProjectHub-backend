import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFilters } from '../ProjectFilters';

// Mock the store
const mockSetActiveFilters = jest.fn();
const mockClearFilters = jest.fn();

jest.mock('@/stores/project', () => ({
  useProjectStore: () => ({
    activeFilters: {
      specializations: [],
      difficultyLevels: [],
      years: [],
      tags: [],
      technologyStack: [],
      isGroupProject: undefined,
      supervisorIds: [],
    },
    setActiveFilters: mockSetActiveFilters,
    clearFilters: mockClearFilters,
  }),
  useHasActiveFilters: () => false,
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockAvailableFilters = {
  specializations: ['Computer Science', 'Software Engineering', 'Data Science', 'Cybersecurity'],
  years: [2024, 2023, 2022, 2021],
  tags: ['machine-learning', 'web-development', 'mobile-app', 'blockchain', 'ai', 'react', 'python'],
  technologyStack: ['React', 'Python', 'Node.js', 'Java', 'TypeScript', 'Docker', 'AWS', 'MongoDB'],
  supervisors: [
    { id: 'sup1', name: 'Dr. Jane Smith', projectCount: 5 },
    { id: 'sup2', name: 'Prof. John Doe', projectCount: 8 },
    { id: 'sup3', name: 'Dr. Alice Johnson', projectCount: 3 },
  ],
};

describe('ProjectFilters', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filters header with title', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders all filter sections', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('Specialization')).toBeInTheDocument();
    expect(screen.getByText('Difficulty Level')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Project Type')).toBeInTheDocument();
    expect(screen.getByText('Technology Stack')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Supervisor')).toBeInTheDocument();
  });

  it('expands and collapses filter sections', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Specialization section should be expanded by default
    expect(screen.getByText('Computer Science')).toBeInTheDocument();

    // Click to collapse
    const specializationHeader = screen.getByText('Specialization');
    await user.click(specializationHeader);

    // Should be collapsed (options hidden)
    await waitFor(() => {
      expect(screen.queryByText('Computer Science')).not.toBeInTheDocument();
    });

    // Click to expand again
    await user.click(specializationHeader);

    // Should be expanded again
    await waitFor(() => {
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
    });
  });

  it('handles specialization filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const csCheckbox = screen.getByLabelText('Computer Science');
    await user.click(csCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      specializations: ['Computer Science'],
    });
  });

  it('handles difficulty level filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const intermediateCheckbox = screen.getByLabelText('intermediate');
    await user.click(intermediateCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      difficultyLevels: ['intermediate'],
    });
  });

  it('handles year filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const year2024Checkbox = screen.getByLabelText('2024');
    await user.click(year2024Checkbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      years: [2024],
    });
  });

  it('handles project type filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const groupProjectCheckbox = screen.getByLabelText('Group Projects Only');
    await user.click(groupProjectCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      isGroupProject: true,
    });
  });

  it('handles technology stack filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const reactCheckbox = screen.getByLabelText('React');
    await user.click(reactCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      technologyStack: ['React'],
    });
  });

  it('handles tags filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const mlCheckbox = screen.getByLabelText('machine-learning');
    await user.click(mlCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      tags: ['machine-learning'],
    });
  });

  it('handles supervisor filter selection', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const supervisorCheckbox = screen.getByLabelText('Dr. Jane Smith');
    await user.click(supervisorCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      supervisorIds: ['sup1'],
    });
  });

  it('shows supervisor project counts', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // Dr. Jane Smith's count
    expect(screen.getByText('8')).toBeInTheDocument(); // Prof. John Doe's count
    expect(screen.getByText('3')).toBeInTheDocument(); // Dr. Alice Johnson's count
  });

  it('handles multiple selections in the same filter', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Select multiple specializations
    const csCheckbox = screen.getByLabelText('Computer Science');
    const seCheckbox = screen.getByLabelText('Software Engineering');

    await user.click(csCheckbox);
    await user.click(seCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      specializations: ['Computer Science'],
    });
    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      specializations: ['Software Engineering'],
    });
  });

  it('handles deselection of filters', async () => {
    // Mock store with active filters
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      activeFilters: {
        specializations: ['Computer Science'],
        difficultyLevels: [],
        years: [],
        tags: [],
        technologyStack: [],
        isGroupProject: undefined,
        supervisorIds: [],
      },
      setActiveFilters: mockSetActiveFilters,
      clearFilters: mockClearFilters,
    });

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const csCheckbox = screen.getByLabelText('Computer Science');
    expect(csCheckbox).toBeChecked();

    await user.click(csCheckbox);

    expect(mockSetActiveFilters).toHaveBeenCalledWith({
      specializations: [],
    });
  });

  it('shows search input for searchable filters', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Technology stack should have search (more than 10 items)
    const techStackSection = screen.getByText('Technology Stack');
    fireEvent.click(techStackSection);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters options based on search input', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Open technology stack section
    const techStackSection = screen.getByText('Technology Stack');
    await user.click(techStackSection);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'react');

    // Should show only React-related options
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });

  it('shows "Show More" button when there are many options', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Tags section has more than 10 items, so should show "Show More"
    const tagsSection = screen.getByText('Tags');
    fireEvent.click(tagsSection);

    // Should show first 10 items and a "Show More" button
    expect(screen.getByText(/show \d+ more/i)).toBeInTheDocument();
  });

  it('expands to show all options when "Show More" is clicked', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const tagsSection = screen.getByText('Tags');
    await user.click(tagsSection);

    const showMoreButton = screen.getByText(/show \d+ more/i);
    await user.click(showMoreButton);

    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });

  it('shows active filters count when filters are applied', () => {
    // Mock store with active filters
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      activeFilters: {
        specializations: ['Computer Science'],
        difficultyLevels: ['intermediate'],
        years: [2024],
        tags: [],
        technologyStack: [],
        isGroupProject: undefined,
        supervisorIds: [],
      },
      setActiveFilters: mockSetActiveFilters,
      clearFilters: mockClearFilters,
    });

    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Active filters count badge
  });

  it('shows clear all button when filters are active', () => {
    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears all filters when clear all button is clicked', async () => {
    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const clearAllButton = screen.getByText('Clear All');
    await user.click(clearAllButton);

    expect(mockClearFilters).toHaveBeenCalled();
  });

  it('shows active filters summary when filters are applied', () => {
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      activeFilters: {
        specializations: ['Computer Science'],
        difficultyLevels: ['intermediate'],
        years: [2024],
        tags: ['machine-learning', 'ai'],
        technologyStack: ['React', 'Python'],
        isGroupProject: true,
        supervisorIds: [],
      },
      setActiveFilters: mockSetActiveFilters,
      clearFilters: mockClearFilters,
    });

    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    expect(screen.getByText('Active Filters')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('limits displayed active filters and shows count for overflow', () => {
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      activeFilters: {
        specializations: [],
        difficultyLevels: [],
        years: [],
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'], // More than 3 tags
        technologyStack: ['tech1', 'tech2', 'tech3', 'tech4'], // More than 2 techs
        isGroupProject: undefined,
        supervisorIds: [],
      },
      setActiveFilters: mockSetActiveFilters,
      clearFilters: mockClearFilters,
    });

    jest.mocked(require('@/stores/project').useHasActiveFilters).mockReturnValue(true);

    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    // Should show first 3 tags and "+2 tags" indicator
    expect(screen.getByText('+2 tags')).toBeInTheDocument();
    
    // Should show first 2 techs and "+2 tech" indicator
    expect(screen.getByText('+2 tech')).toBeInTheDocument();
  });

  it('handles project type toggle correctly', async () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const groupProjectCheckbox = screen.getByLabelText('Group Projects Only');
    const individualProjectCheckbox = screen.getByLabelText('Individual Projects Only');

    // Click group projects
    await user.click(groupProjectCheckbox);
    expect(mockSetActiveFilters).toHaveBeenCalledWith({ isGroupProject: true });

    // Click individual projects (should toggle to false)
    await user.click(individualProjectCheckbox);
    expect(mockSetActiveFilters).toHaveBeenCalledWith({ isGroupProject: false });
  });

  it('applies custom className', () => {
    const customClass = 'custom-filters-class';
    const { container } = render(<ProjectFilters availableFilters={mockAvailableFilters} className={customClass} />);

    // The className should be applied to the root Card component
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles missing available filters gracefully', () => {
    render(<ProjectFilters />);

    // Should still render basic structure
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Difficulty Level')).toBeInTheDocument();
    expect(screen.getByText('Project Type')).toBeInTheDocument();
  });

  it('sorts years in descending order', () => {
    render(<ProjectFilters availableFilters={mockAvailableFilters} />);

    const yearSection = screen.getByText('Year');
    fireEvent.click(yearSection);

    const yearLabels = screen.getAllByText(/202[1-4]/);
    const yearTexts = yearLabels.map(label => label.textContent);
    
    // Should be sorted 2024, 2023, 2022, 2021
    expect(yearTexts).toEqual(['2024', '2023', '2022', '2021']);
  });
});