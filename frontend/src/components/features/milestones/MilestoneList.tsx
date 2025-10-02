'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Filter, 
  Calendar, 
  List, 
  Grid3X3,
  Search,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react';
import { Milestone, MilestoneSearchParams } from '@/types/milestone';
import { useMilestoneStore, useFilteredMilestones, useMilestonesByStatus } from '@/stores/milestone';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui';
import MilestoneCard from './MilestoneCard';
import MilestoneForm from './MilestoneForm';
import MilestoneKanban from './MilestoneKanban';

interface MilestoneListProps {
  projectId?: string;
  hideHeader?: boolean;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({ projectId, hideHeader = false }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    viewMode,
    showCompleted,
    filters,
    searchParams,
    isLoading,
    error,
    getMilestones,
    deleteMilestone,
    setViewMode,
    setShowCompleted,
    setFilters,
    setSearchParams,
    clearFilters,
    clearError,
  } = useMilestoneStore();

  const filteredMilestones = useFilteredMilestones();
  const milestonesByStatus = useMilestonesByStatus();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params: MilestoneSearchParams = {
      ...searchParams,
      query: query || undefined,
      projectId,
    };
    setSearchParams(params);
    getMilestones(params);
  };

  const handleSort = (sortBy: MilestoneSearchParams['sortBy']) => {
    const currentOrder = searchParams.sortOrder || 'asc';
    const newOrder = searchParams.sortBy === sortBy && currentOrder === 'asc' ? 'desc' : 'asc';
    
    const params: MilestoneSearchParams = {
      ...searchParams,
      sortBy,
      sortOrder: newOrder,
      projectId,
    };
    setSearchParams(params);
    getMilestones(params);
  };

  const handleRefresh = () => {
    getMilestones({ ...searchParams, projectId });
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setShowForm(true);
  };

  const handleDelete = async (milestoneId: string) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        await deleteMilestone(milestoneId);
      } catch (error) {
        console.error('Failed to delete milestone:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMilestone(null);
  };

  const getSortIcon = (field: MilestoneSearchParams['sortBy']) => {
    if (searchParams.sortBy !== field) return null;
    return searchParams.sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />;
  };

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="text-red-800">
            <h3 className="font-medium">Error loading milestones</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
            <p className="text-gray-600 mt-1">
              Track your project progress and deadlines
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Milestone
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search milestones..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Show Completed Toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show completed
          </label>

          {/* Filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={filters.status.length > 0 || filters.priority.length > 0 ? 'bg-gray-100' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {(filters.status.length > 0 || filters.priority.length > 0) && (
              <Badge variant="outline" size="sm" className="ml-1">
                {filters.status.length + filters.priority.length}
              </Badge>
            )}
          </Button>

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none border-0 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={`rounded-none border-0 ${viewMode === 'kanban' ? 'bg-gray-100' : ''}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`rounded-none border-0 ${viewMode === 'calendar' ? 'bg-gray-100' : ''}`}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                {['not_started', 'in_progress', 'completed', 'overdue', 'blocked'].map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status as 'not_started' | 'in_progress' | 'completed' | 'on_hold')}
                      onChange={(e) => {
                        const newStatus = e.target.checked
                          ? [...filters.status, status as 'not_started' | 'in_progress' | 'completed' | 'on_hold']
                          : filters.status.filter(s => s !== status);
                        setFilters({ status: newStatus });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="space-y-2">
                {['low', 'medium', 'high', 'critical'].map((priority) => (
                  <label key={priority} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority as 'low' | 'medium' | 'high' | 'critical')}
                      onChange={(e) => {
                        const newPriority = e.target.checked
                          ? [...filters.priority, priority as 'low' | 'medium' | 'high' | 'critical']
                          : filters.priority.filter(p => p !== priority);
                        setFilters({ priority: newPriority });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={filters.dateRange?.from?.toISOString().split('T')[0] || ''}
                  onChange={(value) => setFilters({
                    dateRange: {
                      from: value ? new Date(value) : null,
                      to: filters.dateRange?.to || null,
                    }
                  })}
                  placeholder="From date"
                />
                <Input
                  type="date"
                  value={filters.dateRange?.to?.toISOString().split('T')[0] || ''}
                  onChange={(value) => setFilters({
                    dateRange: {
                      from: filters.dateRange?.from || null,
                      to: value ? new Date(value) : null,
                    }
                  })}
                  placeholder="To date"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Sort Controls */}
      {viewMode === 'list' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('dueDate')}
            className="flex items-center gap-1"
          >
            Due Date {getSortIcon('dueDate')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('priority')}
            className="flex items-center gap-1"
          >
            Priority {getSortIcon('priority')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('progress')}
            className="flex items-center gap-1"
          >
            Progress {getSortIcon('progress')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('title')}
            className="flex items-center gap-1"
          >
            Title {getSortIcon('title')}
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <MilestoneKanban
          milestonesByStatus={milestonesByStatus}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : viewMode === 'calendar' ? (
        <Card className="p-6">
          <div className="text-center text-gray-600">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
            <p>Calendar view will be implemented in a future update.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMilestones.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-600">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones found</h3>
                <p className="mb-4">
                  {searchQuery || filters.status.length > 0 || filters.priority.length > 0
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first milestone to get started.'}
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Milestone
                </Button>
              </div>
            </Card>
          ) : (
            filteredMilestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* Form Modal */}
      <MilestoneForm
        isOpen={showForm}
        onClose={handleCloseForm}
        milestone={editingMilestone}
        projectId={projectId}
      />
    </div>
  );
};

export default MilestoneList;