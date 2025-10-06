'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heart, Search, Bookmark, ArrowRight } from 'lucide-react';

interface EmptyBookmarksStateProps {
    hasFilters?: boolean;
    onBrowseProjects?: () => void;
    onClearFilters?: () => void;
}

export const EmptyBookmarksState: React.FC<EmptyBookmarksStateProps> = ({
    hasFilters = false,
    onBrowseProjects,
    onClearFilters
}) => {
    const handleBrowseProjects = () => {
        if (onBrowseProjects) {
            onBrowseProjects();
        } else {
            // Default navigation to project discovery page
            window.location.href = '/projects';
        }
    };

    if (hasFilters) {
        // Show filtered empty state
        return (
            <Card className="p-12 text-center">
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No bookmarks match your filters
                </h3>
                <p className="text-gray-600 mb-6">
                    Try adjusting your filters or browse more projects to bookmark.
                </p>
                <div className="flex justify-center gap-3">
                    {onClearFilters && (
                        <Button variant="secondary" onClick={onClearFilters}>
                            Clear Filters
                        </Button>
                    )}
                    <Button onClick={handleBrowseProjects}>
                        Browse Projects
                    </Button>
                </div>
            </Card>
        );
    }

    // Show general empty state
    return (
        <Card className="p-12 text-center max-w-2xl mx-auto">
            <div className="relative mb-6">
                <Heart className="w-20 h-20 mx-auto text-gray-200 mb-4" />
                <Bookmark className="w-8 h-8 absolute top-0 right-1/2 transform translate-x-6 -translate-y-1 text-gray-300" />
            </div>
            
            <h3 className="text-xl font-medium text-gray-900 mb-3">
                Start building your project collection
            </h3>
            
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Bookmark interesting projects to save them for later. You can organize them into categories, 
                add notes, and even compare multiple projects side-by-side.
            </p>

            <div className="space-y-4">
                <Button 
                    onClick={handleBrowseProjects}
                    className="inline-flex items-center"
                >
                    Explore Projects
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="text-sm text-gray-500">
                    <p>💡 Tip: Click the heart icon on any project to bookmark it</p>
                </div>
            </div>

            {/* Feature highlights */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Heart className="w-6 h-6 text-gray-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Save Projects</h4>
                    <p className="text-sm text-gray-600">
                        Bookmark projects that interest you for easy access later
                    </p>
                </div>
                
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Bookmark className="w-6 h-6 text-gray-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Organize</h4>
                    <p className="text-sm text-gray-600">
                        Create categories and add notes to keep your bookmarks organized
                    </p>
                </div>
                
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-gray-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Compare</h4>
                    <p className="text-sm text-gray-600">
                        Compare multiple projects to find the perfect match for you
                    </p>
                </div>
            </div>
        </Card>
    );
};