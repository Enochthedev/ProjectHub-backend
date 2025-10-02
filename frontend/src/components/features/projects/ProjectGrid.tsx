'use client';

import React from 'react';
import { Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Project, ProjectSearchResponse } from '@/types/project';
import { useProjectStore } from '@/stores/project';
import { cn } from '@/lib/utils';

interface ProjectGridProps {
  data?: ProjectSearchResponse;
  loading?: boolean;
  error?: string | null;
  onProjectView?: (projectId: string) => void;
  className?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 py-1 text-gray-500">...</span>
            ) : (
              <Button
                variant={currentPage === page ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                className="min-w-[2.5rem]"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const ProjectGridSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => {
  const skeletonCount = viewMode === 'grid' ? 12 : 6;
  
  return (
    <div className={cn(
      viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'space-y-4'
    )}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <ProjectCard
          key={index}
          project={{} as Project}
          variant={viewMode === 'list' ? 'compact' : 'detailed'}
          loading={true}
        />
      ))}
    </div>
  );
};

const EmptyState: React.FC<{ hasFilters: boolean; onClearFilters: () => void }> = ({
  hasFilters,
  onClearFilters,
}) => {
  return (
    <Card variant="outlined" className="p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Grid className="h-8 w-8 text-gray-400" />
        </div>
        
        <h3 className="text-lg font-medium text-black mb-2">
          {hasFilters ? 'No projects match your filters' : 'No projects found'}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {hasFilters
            ? 'Try adjusting your search criteria or clearing some filters.'
            : 'There are no projects available at the moment. Check back later!'}
        </p>
        
        {hasFilters && (
          <Button onClick={onClearFilters} variant="outline">
            Clear All Filters
          </Button>
        )}
      </div>
    </Card>
  );
};

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  data,
  loading = false,
  error,
  onProjectView,
  className,
}) => {
  const { searchParams, setSearchParams, clearFilters } = useProjectStore();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  const handlePageChange = (page: number) => {
    setSearchParams({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  // Show error state
  if (error) {
    return (
      <Card variant="outlined" className={cn('p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Grid className="h-8 w-8 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-medium text-black mb-2">
            Something went wrong
          </h3>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className={className}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-gray-200 rounded h-6 w-32 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 rounded h-8 w-16 animate-pulse" />
            <div className="bg-gray-200 rounded h-8 w-16 animate-pulse" />
          </div>
        </div>
        
        <ProjectGridSkeleton viewMode={viewMode} />
      </div>
    );
  }

  // Show empty state
  if (!data || data.projects.length === 0) {
    return (
      <div className={className}>
        <EmptyState 
          hasFilters={Object.keys(searchParams).some(key => 
            key !== 'page' && key !== 'limit' && searchParams[key as keyof typeof searchParams]
          )}
          onClearFilters={clearFilters}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with results count and view controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-black">
            {data.pagination.total} {data.pagination.total === 1 ? 'Project' : 'Projects'}
          </h2>
          
          {searchParams.query && (
            <span className="text-sm text-gray-600">
              for "{searchParams.query}"
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 border-2 border-gray-200 rounded">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('grid')}
            className="border-0 rounded-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('list')}
            className="border-0 rounded-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects grid/list */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      )}>
        {data.projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            variant={viewMode === 'list' ? 'compact' : 'detailed'}
            onView={onProjectView}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {/* Results summary */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
        {data.pagination.total} results
      </div>
    </div>
  );
};

export default ProjectGrid;