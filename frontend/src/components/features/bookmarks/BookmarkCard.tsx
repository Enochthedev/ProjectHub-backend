'use client';

import React, { useState } from 'react';
import { Bookmark } from '@/types/project';
import { useBookmarkStore } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui';
import { 
    Heart, 
    ExternalLink, 
    Edit3, 
    Trash2, 
    Plus, 
    Minus,
    Calendar,
    User,
    Tag,
    Github,
    Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BookmarkCardProps {
    bookmark: Bookmark;
    viewMode: 'grid' | 'list';
    className?: string;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ 
    bookmark, 
    viewMode, 
    className = '' 
}) => {
    const {
        deleteBookmark,
        toggleBookmarkSelection,
        selectedBookmarks,
        addToComparison,
        removeFromComparison,
        isInComparison
    } = useBookmarkStore();
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditNotes, setShowEditNotes] = useState(false);
    
    const isSelected = selectedBookmarks.includes(bookmark.id);
    const inComparison = isInComparison(bookmark.projectId);
    
    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to remove this bookmark?')) {
            setIsDeleting(true);
            try {
                await deleteBookmark(bookmark.id);
            } catch (error) {
                console.error('Failed to delete bookmark:', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };
    
    const handleToggleComparison = () => {
        if (inComparison) {
            removeFromComparison(bookmark.projectId);
        } else {
            addToComparison(bookmark.project);
        }
    };
    
    const handleViewProject = () => {
        window.open(`/projects/${bookmark.projectId}`, '_blank');
    };

    if (viewMode === 'list') {
        return (
            <Card className={`p-4 hover:border-gray-400 transition-colors ${className}`}>
                <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBookmarkSelection(bookmark.id)}
                        className="w-4 h-4 border-2 border-gray-300 rounded-none focus:ring-2 focus:ring-gray-400"
                    />
                    
                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-medium text-black truncate">
                                    {bookmark.project.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {bookmark.project.supervisor.name} • {bookmark.project.specialization}
                                </p>
                                {bookmark.notes && (
                                    <p className="text-sm text-gray-500 mt-1 italic">
                                        &ldquo;{bookmark.notes}&rdquo;
                                    </p>
                                )}
                            </div>
                            
                            {/* Category Badge */}
                            {bookmark.category && (
                                <Badge variant="secondary" className="ml-2">
                                    {bookmark.category.name}
                                </Badge>
                            )}
                        </div>
                        
                        {/* Tags */}
                        <div className="flex gap-1 mt-2">
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
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                        </span>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToggleComparison}
                            title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
                            className="h-8 w-8 p-0"
                        >
                            {inComparison ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewProject}
                            title="View project"
                            className="h-8 w-8 p-0"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            title="Remove bookmark"
                            className="h-8 w-8 p-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`p-6 hover:border-gray-400 transition-colors ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBookmarkSelection(bookmark.id)}
                    className="w-4 h-4 border-2 border-gray-300 rounded-none focus:ring-2 focus:ring-gray-400"
                />
                
                <Heart className="w-5 h-5 text-red-500 fill-current" />
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
                {bookmark.project.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                    </Badge>
                ))}
                {bookmark.project.tags.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                        +{bookmark.project.tags.length - 4}
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
            
            {/* External Links */}
            {(bookmark.project.githubUrl || bookmark.project.demoUrl) && (
                <div className="flex gap-2 mb-4">
                    {bookmark.project.githubUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(bookmark.project.githubUrl, '_blank')}
                        >
                            <Github className="w-4 h-4" />
                        </Button>
                    )}
                    {bookmark.project.demoUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(bookmark.project.demoUrl, '_blank')}
                        >
                            <Globe className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-between items-center">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleViewProject}
                    className="flex items-center"
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Project
                </Button>
                
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleComparison}
                        title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
                        className="h-8 w-8 p-0"
                    >
                        {inComparison ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditNotes(!showEditNotes)}
                        title="Edit notes"
                        className="h-8 w-8 p-0"
                    >
                        <Edit3 className="w-4 h-4" />
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Remove bookmark"
                        className="h-8 w-8 p-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};