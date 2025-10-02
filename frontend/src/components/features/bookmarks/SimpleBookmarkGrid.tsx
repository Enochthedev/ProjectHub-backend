'use client';

import React, { useEffect } from 'react';
import { useBookmarkStore } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui';
import { Heart, ExternalLink, Calendar, User, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const SimpleBookmarkGrid: React.FC = () => {
    const { 
        bookmarks, 
        categories, 
        isLoading, 
        error, 
        fetchBookmarks, 
        fetchCategories,
        clearError 
    } = useBookmarkStore();

    useEffect(() => {
        // Only fetch if we don't have data and aren't loading
        if (bookmarks.length === 0 && !isLoading) {
            fetchBookmarks().catch(console.error);
        }
        if (categories.length === 0 && !isLoading) {
            fetchCategories().catch(console.error);
        }
    }, [bookmarks.length, categories.length, isLoading, fetchBookmarks, fetchCategories]);

    // Ensure bookmarks is always an array
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    if (error) {
        return (
            <Card className="p-6 text-center">
                <div className="text-red-600 mb-4">
                    Error: {error}
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

    if (isLoading) {
        return (
            <Card className="p-6 text-center">
                <div className="text-gray-600">
                    Loading bookmarks...
                </div>
            </Card>
        );
    }

    if (safeBookmarks.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No bookmarks yet
                </h3>
                <p className="text-gray-600 mb-6">
                    Start bookmarking projects to see them here.
                </p>
                <Button onClick={() => window.location.href = '/dashboard'}>
                    Browse Projects
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">My Bookmarks</h1>
                    <p className="text-gray-600 mt-1">
                        {safeBookmarks.length} bookmark{safeBookmarks.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {safeBookmarks.map((bookmark) => (
                    <Card key={bookmark.id} className="p-6 hover:border-gray-400 transition-colors">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <Heart className="w-5 h-5 text-black fill-current" />
                        </div>
                        
                        {/* Project Title */}
                        <h3 className="font-medium text-black mb-2 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {bookmark.project.title}
                        </h3>
                        
                        {/* Project Abstract */}
                        <p className="text-sm text-gray-600 mb-4 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {bookmark.project.abstract}
                        </p>
                        
                        {/* Category */}
                        {bookmark.category && (
                            <Badge variant="secondary" className="mb-3">
                                {bookmark.category.name}
                            </Badge>
                        )}
                        
                        {/* Notes */}
                        {bookmark.notes && (
                            <div className="mb-4 p-3 bg-gray-50 border-l-2 border-gray-300">
                                <p className="text-sm text-gray-700 italic">
                                    &ldquo;{bookmark.notes}&rdquo;
                                </p>
                            </div>
                        )}
                        
                        {/* Project Details */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                                <User className="w-4 h-4 mr-2" />
                                {bookmark.project.supervisor.name}
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                                <Tag className="w-4 h-4 mr-2" />
                                {bookmark.project.specialization}
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                Bookmarked {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                            </div>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-4">
                            {bookmark.project.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {bookmark.project.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{bookmark.project.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                        
                        {/* Difficulty Badge */}
                        <div className="mb-4">
                            <Badge 
                                variant={
                                    bookmark.project.difficultyLevel === 'beginner' ? 'secondary' :
                                    bookmark.project.difficultyLevel === 'intermediate' ? 'outline' : 'default'
                                }
                                className="capitalize"
                            >
                                {bookmark.project.difficultyLevel}
                            </Badge>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex justify-between items-center">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(`/projects/${bookmark.projectId}`, '_blank')}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Project
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};