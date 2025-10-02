'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { useProjectStore, useSearchParamsWithFilters, useHasActiveFilters } from '@/stores/project';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface ProjectSearchProps {
  onToggleFilters?: () => void;
  showFiltersToggle?: boolean;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  type: 'query' | 'tag' | 'technology' | 'specialization';
  value: string;
  count?: number;
}

// Mock search suggestions - in a real app, this would come from an API
const mockSuggestions: SearchSuggestion[] = [
  { type: 'query', value: 'machine learning', count: 15 },
  { type: 'query', value: 'web development', count: 23 },
  { type: 'query', value: 'mobile app', count: 12 },
  { type: 'technology', value: 'React', count: 18 },
  { type: 'technology', value: 'Python', count: 25 },
  { type: 'technology', value: 'Node.js', count: 14 },
  { type: 'specialization', value: 'Computer Science', count: 45 },
  { type: 'specialization', value: 'Software Engineering', count: 32 },
  { type: 'tag', value: 'AI', count: 20 },
  { type: 'tag', value: 'blockchain', count: 8 },
];

export const ProjectSearch: React.FC<ProjectSearchProps> = ({
  onToggleFilters,
  showFiltersToggle = true,
  placeholder = 'Search projects, technologies, or keywords...',
  className,
}) => {
  const { searchParams, setSearchParams, clearSearchParams } = useProjectStore();
  const searchParamsWithFilters = useSearchParamsWithFilters();
  const hasActiveFilters = useHasActiveFilters();
  
  const [inputValue, setInputValue] = useState(searchParams.query || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Debounce the input value to avoid too many API calls
  const debouncedQuery = useDebounce(inputValue, 300);

  // Update search params when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== searchParams.query) {
      setSearchParams({ query: debouncedQuery, page: 1 });
    }
  }, [debouncedQuery, searchParams.query, setSearchParams]);

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) return [];
    
    return mockSuggestions.filter(suggestion =>
      suggestion.value.toLowerCase().includes(inputValue.toLowerCase())
    ).slice(0, 8);
  }, [inputValue]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
    setIsSearching(true);
    
    // Hide searching indicator after debounce delay
    setTimeout(() => setIsSearching(false), 350);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.value);
    setSearchParams({ query: suggestion.value, page: 1 });
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(filteredSuggestions[selectedSuggestionIndex]);
        } else {
          setSearchParams({ query: inputValue, page: 1 });
          setShowSuggestions(false);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clear search
  const handleClear = () => {
    setInputValue('');
    clearSearchParams();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get suggestion type icon and color
  const getSuggestionTypeInfo = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query':
        return { icon: Search, color: 'text-gray-500' };
      case 'technology':
        return { icon: SlidersHorizontal, color: 'text-blue-600' };
      case 'specialization':
        return { icon: Filter, color: 'text-green-600' };
      case 'tag':
        return { icon: Filter, color: 'text-purple-600' };
      default:
        return { icon: Search, color: 'text-gray-500' };
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="pl-10 pr-20"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {/* Clear button */}
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Filters toggle */}
          {showFiltersToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFilters}
              className={cn(
                'h-6 w-6 p-0 hover:bg-gray-100',
                hasActiveFilters && 'text-black bg-gray-100'
              )}
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Card
          ref={suggestionsRef}
          variant="outlined"
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto"
        >
          <div className="py-2">
            {filteredSuggestions.map((suggestion, index) => {
              const { icon: Icon, color } = getSuggestionTypeInfo(suggestion.type);
              
              return (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors',
                    selectedSuggestionIndex === index && 'bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', color)} />
                    <span className="text-sm text-gray-900">{suggestion.value}</span>
                    <Badge variant="secondary" size="sm" className="text-xs">
                      {suggestion.type}
                    </Badge>
                  </div>
                  
                  {suggestion.count && (
                    <span className="text-xs text-gray-500">
                      {suggestion.count} projects
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active Search Summary */}
      {(searchParams.query || hasActiveFilters) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span>Searching for:</span>
          
          {searchParams.query && (
            <Badge variant="outline" size="sm">
              "{searchParams.query}"
            </Badge>
          )}
          
          {hasActiveFilters && (
            <Badge variant="secondary" size="sm">
              + filters applied
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleClear();
              if (hasActiveFilters) {
                // This would need to be connected to the filters clear function
                // For now, just clear search
              }
            }}
            className="text-xs ml-auto"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Search Shortcuts Hint */}
      <div className="mt-2 text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">
          ↑↓
        </kbd>{' '}
        to navigate,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">
          Enter
        </kbd>{' '}
        to select,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">
          Esc
        </kbd>{' '}
        to close
      </div>
    </div>
  );
};

export default ProjectSearch;