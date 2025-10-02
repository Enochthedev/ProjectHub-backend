'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/project';
import { useBookmarkStore } from '@/stores/bookmark';
import { Button } from '@/components/ui/Button';
import { Heart } from 'lucide-react';

interface BookmarkButtonProps {
    project: Project;
    variant?: 'default' | 'icon-only';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showText?: boolean;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
    project,
    variant = 'default',
    size = 'md',
    className = '',
    showText = true
}) => {
    const { 
        toggleBookmark, 
        isProjectBookmarked,
        clearError
    } = useBookmarkStore();
    
    const [isToggling, setIsToggling] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Update local state when bookmark status changes
    useEffect(() => {
        setIsBookmarked(isProjectBookmarked(project.id));
    }, [project.id, isProjectBookmarked]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isToggling) return;
        
        setIsToggling(true);
        clearError();
        
        try {
            await toggleBookmark(project);
            // Optimistically update UI
            setIsBookmarked(!isBookmarked);
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        } finally {
            setIsToggling(false);
        }
    };

    if (variant === 'icon-only') {
        return (
            <Button
                variant="ghost"
                size={size}
                onClick={handleToggle}
                disabled={isToggling}
                className={`${className} ${isBookmarked ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
                <Heart 
                    className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} 
                />
            </Button>
        );
    }

    return (
        <Button
            variant={isBookmarked ? 'primary' : 'secondary'}
            size={size}
            onClick={handleToggle}
            disabled={isToggling}
            loading={isToggling}
            className={className}
        >
            <Heart 
                className={`w-4 h-4 ${showText ? 'mr-2' : ''} ${isBookmarked ? 'fill-current' : ''}`} 
            />
            {showText && (isBookmarked ? 'Bookmarked' : 'Bookmark')}
        </Button>
    );
};

// Bookmark Status Indicator (for use in project cards, lists, etc.)
interface BookmarkStatusProps {
    projectId: string;
    className?: string;
}

export const BookmarkStatus: React.FC<BookmarkStatusProps> = ({ 
    projectId, 
    className = '' 
}) => {
    const { isProjectBookmarked } = useBookmarkStore();
    const isBookmarked = isProjectBookmarked(projectId);

    if (!isBookmarked) return null;

    return (
        <div className={`inline-flex items-center ${className}`}>
            <Heart className="w-4 h-4 text-black fill-current" />
        </div>
    );
};

// Bookmark Count Display
interface BookmarkCountProps {
    count: number;
    className?: string;
}

export const BookmarkCount: React.FC<BookmarkCountProps> = ({ 
    count, 
    className = '' 
}) => {
    return (
        <div className={`inline-flex items-center text-sm text-gray-600 ${className}`}>
            <Heart className="w-4 h-4 mr-1" />
            {count}
        </div>
    );
};