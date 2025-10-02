'use client';

import React, { useState } from 'react';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { useProjectStore, useHasActiveFilters } from '@/stores/project';

import { cn } from '@/lib/utils';

interface ProjectFiltersProps {
  availableFilters?: {
    specializations: string[];
    years: number[];
    tags: string[];
    technologyStack: string[];
    supervisors: Array<{
      id: string;
      name: string;
      projectCount: number;
    }>;
  };
  className?: string;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-black">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

interface CheckboxFilterProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  maxVisible?: number;
}

const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
  options,
  selectedValues,
  onChange,
  searchable = false,
  maxVisible = 10,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const visibleOptions = showAll
    ? filteredOptions
    : filteredOptions.slice(0, maxVisible);

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      {searchable && (
        <Input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="text-sm"
        />
      )}
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {visibleOptions.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={() => handleToggle(option)}
              className="h-4 w-4 border-2 border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            />
            <span className="text-sm text-gray-700 flex-1">{option}</span>
          </label>
        ))}
      </div>

      {filteredOptions.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="text-xs"
        >
          {showAll ? 'Show Less' : `Show ${filteredOptions.length - maxVisible} More`}
        </Button>
      )}
    </div>
  );
};

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  availableFilters,
  className,
}) => {
  const { activeFilters, setActiveFilters, clearFilters } = useProjectStore();
  const hasActiveFilters = useHasActiveFilters();

  const handleSpecializationChange = (values: string[]) => {
    setActiveFilters({ specializations: values });
  };

  const handleDifficultyChange = (values: string[]) => {
    setActiveFilters({ 
      difficultyLevels: values as ('beginner' | 'intermediate' | 'advanced')[] 
    });
  };

  const handleYearChange = (values: string[]) => {
    setActiveFilters({ years: values.map(Number) });
  };

  const handleTagChange = (values: string[]) => {
    setActiveFilters({ tags: values });
  };

  const handleTechnologyChange = (values: string[]) => {
    setActiveFilters({ technologyStack: values });
  };

  const handleSupervisorChange = (values: string[]) => {
    setActiveFilters({ supervisorIds: values });
  };

  const handleGroupProjectToggle = () => {
    setActiveFilters({ 
      isGroupProject: activeFilters.isGroupProject === undefined 
        ? true 
        : activeFilters.isGroupProject 
          ? false 
          : undefined 
    });
  };

  const getActiveFilterCount = () => {
    return (
      activeFilters.specializations.length +
      activeFilters.difficultyLevels.length +
      activeFilters.years.length +
      activeFilters.tags.length +
      activeFilters.technologyStack.length +
      activeFilters.supervisorIds.length +
      (activeFilters.isGroupProject !== undefined ? 1 : 0)
    );
  };

  return (
    <Card variant="outlined" className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-black">Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" size="sm">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200">
        {/* Specialization Filter */}
        {availableFilters?.specializations && (
          <FilterSection title="Specialization">
            <CheckboxFilter
              options={availableFilters.specializations}
              selectedValues={activeFilters.specializations}
              onChange={handleSpecializationChange}
              searchable={availableFilters.specializations.length > 10}
            />
          </FilterSection>
        )}

        {/* Difficulty Level Filter */}
        <FilterSection title="Difficulty Level">
          <CheckboxFilter
            options={['beginner', 'intermediate', 'advanced']}
            selectedValues={activeFilters.difficultyLevels}
            onChange={handleDifficultyChange}
          />
        </FilterSection>

        {/* Year Filter */}
        {availableFilters?.years && (
          <FilterSection title="Year">
            <CheckboxFilter
              options={availableFilters.years.map(String).sort((a, b) => Number(b) - Number(a))}
              selectedValues={activeFilters.years.map(String)}
              onChange={handleYearChange}
            />
          </FilterSection>
        )}

        {/* Project Type Filter */}
        <FilterSection title="Project Type">
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={activeFilters.isGroupProject === true}
                onChange={handleGroupProjectToggle}
                className="h-4 w-4 border-2 border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              />
              <span className="text-sm text-gray-700">Group Projects Only</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={activeFilters.isGroupProject === false}
                onChange={handleGroupProjectToggle}
                className="h-4 w-4 border-2 border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              />
              <span className="text-sm text-gray-700">Individual Projects Only</span>
            </label>
          </div>
        </FilterSection>

        {/* Technology Stack Filter */}
        {availableFilters?.technologyStack && (
          <FilterSection title="Technology Stack">
            <CheckboxFilter
              options={availableFilters.technologyStack}
              selectedValues={activeFilters.technologyStack}
              onChange={handleTechnologyChange}
              searchable={availableFilters.technologyStack.length > 10}
            />
          </FilterSection>
        )}

        {/* Tags Filter */}
        {availableFilters?.tags && (
          <FilterSection title="Tags">
            <CheckboxFilter
              options={availableFilters.tags}
              selectedValues={activeFilters.tags}
              onChange={handleTagChange}
              searchable={availableFilters.tags.length > 10}
            />
          </FilterSection>
        )}

        {/* Supervisor Filter */}
        {availableFilters?.supervisors && (
          <FilterSection title="Supervisor">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableFilters.supervisors.map((supervisor) => (
                <label
                  key={supervisor.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.supervisorIds.includes(supervisor.id)}
                      onChange={() => {
                        const newValues = activeFilters.supervisorIds.includes(supervisor.id)
                          ? activeFilters.supervisorIds.filter(id => id !== supervisor.id)
                          : [...activeFilters.supervisorIds, supervisor.id];
                        handleSupervisorChange(newValues);
                      }}
                      className="h-4 w-4 border-2 border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    />
                    <span className="text-sm text-gray-700">{supervisor.name}</span>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {supervisor.projectCount}
                  </Badge>
                </label>
              ))}
            </div>
          </FilterSection>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Active Filters</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {activeFilters.specializations.map((spec) => (
              <Badge
                key={`spec-${spec}`}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {spec}
              </Badge>
            ))}
            
            {activeFilters.difficultyLevels.map((level) => (
              <Badge
                key={`diff-${level}`}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {level}
              </Badge>
            ))}
            
            {activeFilters.years.map((year) => (
              <Badge
                key={`year-${year}`}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {year}
              </Badge>
            ))}
            
            {activeFilters.tags.slice(0, 3).map((tag) => (
              <Badge
                key={`tag-${tag}`}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
            
            {activeFilters.tags.length > 3 && (
              <Badge variant="outline" size="sm" className="text-xs">
                +{activeFilters.tags.length - 3} tags
              </Badge>
            )}
            
            {activeFilters.technologyStack.slice(0, 2).map((tech) => (
              <Badge
                key={`tech-${tech}`}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {tech}
              </Badge>
            ))}
            
            {activeFilters.technologyStack.length > 2 && (
              <Badge variant="outline" size="sm" className="text-xs">
                +{activeFilters.technologyStack.length - 2} tech
              </Badge>
            )}
            
            {activeFilters.isGroupProject !== undefined && (
              <Badge variant="outline" size="sm" className="text-xs">
                {activeFilters.isGroupProject ? 'Group' : 'Individual'}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProjectFilters;