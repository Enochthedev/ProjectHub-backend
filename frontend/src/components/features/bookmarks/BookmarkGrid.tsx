'use client';

import React, { useEffect, useState } from 'react';
import { useBookmarkStore, useFilteredBookmarks, useHasActiveFilters } from '@/stores/bookmark';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkFilters } from './BookmarkFilters';
import { BulkActions } from './BulkActions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Grid, Filter as FilterIcon, LayoutGrid, List } from 'lucide-react';
import { EmptyBookmarksState } from './EmptyBookmarksState';

interface BookmarkGridProps {
    className?: string;
}

type ViewMode = 'grid' | 'list';

export const BookmarkGrid: React.FC<BookmarkGridProps> = ({ className = '' }) => {
    const {
        fetchBookmarks,
        fetchCategories,
        isLoading,
        error,
        selectedBookmarks,
        selectedCategory,
        setSelectedCategory,
        clearError
    } = useBookmarkStore();
    
    const filteredBookmarks = useFilteredBookmarks();
    const hasActiveFilters = useHasActiveFilters();
    
    // Additional safety check
    const safeFilteredBookmarks = Array.isArray(filteredBookmarks) ? filteredBookmarks : [];
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchBookmarks();
        fetchCategories();
    }, [fetchBookmarks, fetchCategories]);

    if (error) {
        return (
            <Card className="p-6 text-center">
                <div className="text-gray-600 mb-4">
                    Failed to load bookmarks: {error}
                </div>
                <Button onClick={() => {
                    clearError();
                    fetchBookmarks();
                }}>
                    Try Again
                </Button>
            </Card>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">My Bookmarks</h1>
                    <p className="text-gray-600 mt-1">
                        {safeFilteredBookmarks.length} bookmark{safeFilteredBookmarks.length !== 1 ? 's' : ''}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex border-2 border-gray-200 rounded">
                        <Button
                            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="rounded-none border-0"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="rounded-none border-0 border-l-2 border-gray-200"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    {/* Filter Toggle */}
                    <Button
                        variant={showFilters ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FilterIcon className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedBookmarks.length > 0 && (
                <BulkActions />
            )}

            {/* Filters */}
            {showFilters && (
                <BookmarkFilters />
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <BookmarkCardSkeleton key={index} viewMode={viewMode} />
                    ))}
                </div>
            ) : (
                <>
                    {/* Empty State */}
                    {safeFilteredBookmarks.length === 0 ? (
                        <EmptyBookmarksState 
                            hasFilters={hasActiveFilters}
                            onBrowseProjects={() => window.location.href = '/projects'}
                            onClearFilters={() => {
                                const { clearFilters } = useBookmarkStore.getState();
                                clearFilters();
                                setShowFilters(false);
                            }}
                        />
                    ) : (
                        /* Bookmarks Grid/List */
                        <div className={viewMode === 'grid' 
                            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                            : 'space-y-4'
                        }>
                            {safeFilteredBookmarks.map((bookmark) => (
                                <BookmarkCard
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const BookmarkCardSkeleton: React.FC<{ viewMode: ViewMode }> = ({ viewMode }) => {
    if (viewMode === 'list') {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-4 h-4" />
                    <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="w-20 h-6" />
                        <Skeleton className="w-20 h-6" />
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-8 h-8" />
            </div>
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-2 mb-4">
                <Skeleton className="w-16 h-6" />
                <Skeleton className="w-20 h-6" />
            </div>
            <div className="flex justify-between items-center">
                <Skeleton className="w-24 h-4" />
                <div className="flex gap-2">
                    <Skeleton className="w-8 h-8" />
                    <Skeleton className="w-8 h-8" />
                </div>
            </div>
        </Card>
    );
};