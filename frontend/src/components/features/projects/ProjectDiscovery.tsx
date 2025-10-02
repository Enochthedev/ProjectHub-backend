'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProjectSearch } from './ProjectSearch';
import { ProjectFilters } from './ProjectFilters';
import { ProjectGrid } from './ProjectGrid';
import { ProjectDetail } from './ProjectDetail';
import { Button } from '@/components/ui/Button';
import { useProjectSearch } from '@/hooks/useProjects';
import { useProjectStore, useSearchParamsWithFilters } from '@/stores/project';
import { cn } from '@/lib/utils';

interface ProjectDiscoveryProps {
  className?: string;
}

export const ProjectDiscovery: React.FC<ProjectDiscoveryProps> = ({
  className,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { data, isLoading, error } = useProjectSearch();
  const { setSearchParams } = useProjectStore();
  const searchParams = useSearchParamsWithFilters();

  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleProjectView = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleBackToGrid = () => {
    setSelectedProjectId(null);
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setSearchParams({ 
      sortBy: sortBy as any, 
      sortOrder,
      page: 1 
    });
  };

  // Show project detail view
  if (selectedProjectId) {
    return (
      <div className={className}>
        <ProjectDetail
          projectId={selectedProjectId}
          onBack={handleBackToGrid}
          onProjectView={handleProjectView}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black">
            Discover Projects
          </h1>
          <p className="text-gray-600 mt-1">
            Find Final Year Projects that match your interests and skills
          </p>
        </div>

        {/* Mobile filters toggle */}
        <div className="md:hidden">
          <Button
            variant="outline"
            onClick={handleToggleFilters}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <ProjectSearch
        onToggleFilters={handleToggleFilters}
        showFiltersToggle={!showFilters}
      />

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          
          <select
            value={`${searchParams.sortBy}-${searchParams.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              handleSortChange(sortBy, sortOrder as 'asc' | 'desc');
            }}
            className="text-sm border-2 border-gray-200 rounded px-3 py-1 focus:border-black focus:outline-none"
          >
            <option value="relevance-desc">Relevance</option>
            <option value="successScore-desc">Highest Success Rate</option>
            <option value="averageGrade-desc">Best Average Grade</option>
            <option value="studentSatisfaction-desc">Most Satisfied Students</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="viewCount-desc">Most Viewed</option>
            <option value="bookmarkCount-desc">Most Bookmarked</option>
          </select>
        </div>

        {/* Results per page */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={searchParams.limit}
            onChange={(e) => {
              setSearchParams({ 
                limit: Number(e.target.value),
                page: 1 
              });
            }}
            className="text-sm border-2 border-gray-200 rounded px-3 py-1 focus:border-black focus:outline-none"
          >
            <option value={6}>6 per page</option>
            <option value={12}>12 per page</option>
            <option value={24}>24 per page</option>
            <option value={48}>48 per page</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className={cn(
          'transition-all duration-300 ease-in-out',
          showFilters ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden',
          'md:block hidden'
        )}>
          {showFilters && (
            <div className="sticky top-6">
              <ProjectFilters
                availableFilters={data?.filters}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Mobile Filters Overlay */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="font-medium text-black">Filters</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <ProjectFilters
                availableFilters={data?.filters}
                className="border-0"
              />
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="flex-1 min-w-0">
          <ProjectGrid
            data={data}
            loading={isLoading}
            error={error?.message}
            onProjectView={handleProjectView}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDiscovery;