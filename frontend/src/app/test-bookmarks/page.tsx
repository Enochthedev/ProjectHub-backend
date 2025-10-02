'use client';

import React, { useEffect } from 'react';
import { useBookmarkStore } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for testing
const mockBookmarks = [
    {
        id: 'bookmark-1',
        projectId: 'project-1',
        notes: 'Interesting React project',
        createdAt: '2024-01-01T00:00:00Z',
        project: {
            id: 'project-1',
            title: 'React Dashboard',
            abstract: 'A modern dashboard built with React and TypeScript',
            specialization: 'Computer Science',
            difficultyLevel: 'intermediate' as const,
            year: 2024,
            tags: ['react', 'typescript', 'dashboard'],
            technologyStack: ['React', 'TypeScript', 'Tailwind CSS'],
            isGroupProject: false,
            approvalStatus: 'approved' as const,
            supervisor: {
                id: 'supervisor-1',
                name: 'Dr. Smith',
                specializations: ['Computer Science']
            },
            viewCount: 150,
            bookmarkCount: 25,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
        }
    },
    {
        id: 'bookmark-2',
        projectId: 'project-2',
        notes: 'Great Vue.js example',
        createdAt: '2024-01-02T00:00:00Z',
        project: {
            id: 'project-2',
            title: 'Vue.js E-commerce',
            abstract: 'An e-commerce platform built with Vue.js',
            specialization: 'Software Engineering',
            difficultyLevel: 'advanced' as const,
            year: 2024,
            tags: ['vue', 'javascript', 'ecommerce'],
            technologyStack: ['Vue.js', 'JavaScript', 'Node.js'],
            isGroupProject: true,
            approvalStatus: 'approved' as const,
            supervisor: {
                id: 'supervisor-2',
                name: 'Dr. Johnson',
                specializations: ['Software Engineering']
            },
            viewCount: 200,
            bookmarkCount: 40,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z'
        }
    }
];

export default function TestBookmarksPage() {
    const { bookmarks, setLoading, setError } = useBookmarkStore();

    // Load mock data for testing
    useEffect(() => {
        // Simulate loading mock data
        setLoading(true);
        setTimeout(() => {
            // Manually set bookmarks for testing
            useBookmarkStore.setState({ 
                bookmarks: mockBookmarks,
                isLoading: false,
                error: null 
            });
        }, 1000);
    }, [setLoading, setError]);

    const useTestSelector = () => {
        const filteredBookmarks = useBookmarkStore((state) => {
            const bookmarksArray = state.bookmarks || [];
            
            if (!state.selectedCategory) {
                return bookmarksArray;
            }

            return bookmarksArray.filter(bookmark =>
                bookmark.category?.id === state.selectedCategory
            );
        });

        console.log('Filtered bookmarks:', filteredBookmarks);
        alert(`Found ${filteredBookmarks.length} bookmarks`);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="p-6">
                <h1 className="text-2xl font-bold mb-4">Bookmark Store Test</h1>
                
                <div className="space-y-4">
                    <div>
                        <strong>Bookmarks in store:</strong> {bookmarks.length}
                    </div>
                    
                    <Button onClick={() => console.log('Test selector clicked')}>
                        Test Filtered Bookmarks Selector
                    </Button>
                    
                    <div className="space-y-2">
                        <h3 className="font-medium">Bookmarks:</h3>
                        {bookmarks.map((bookmark) => (
                            <Card key={bookmark.id} className="p-4">
                                <h4 className="font-medium">{bookmark.project.title}</h4>
                                <p className="text-sm text-gray-600">{bookmark.project.abstract}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Notes: {bookmark.notes || 'No notes'}
                                </p>
                            </Card>
                        ))}
                    </div>
                    
                    {bookmarks.length === 0 && (
                        <Card className="p-8 text-center">
                            <p className="text-gray-600">No bookmarks loaded yet...</p>
                        </Card>
                    )}
                </div>
            </Card>
        </div>
    );
}