'use client';

import React, { useEffect, useState } from 'react';
import { useBookmarkStore, useFilteredBookmarks } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BookmarkTestPage() {
    const [testResults, setTestResults] = useState<string[]>([]);
    const { bookmarks, categories, isLoading, error } = useBookmarkStore();
    const filteredBookmarks = useFilteredBookmarks();

    const addTestResult = (result: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
    };

    const testStore = () => {
        addTestResult('Testing bookmark store...');
        
        // Test 1: Check initial state
        addTestResult(`Initial bookmarks: ${bookmarks.length}`);
        addTestResult(`Initial categories: ${categories.length}`);
        addTestResult(`Is loading: ${isLoading}`);
        addTestResult(`Error: ${error || 'none'}`);
        
        // Test 2: Check selector
        addTestResult(`Filtered bookmarks type: ${Array.isArray(filteredBookmarks) ? 'array' : typeof filteredBookmarks}`);
        addTestResult(`Filtered bookmarks length: ${filteredBookmarks.length}`);
        
        // Test 3: Add mock data
        const mockBookmark = {
            id: 'test-bookmark-1',
            projectId: 'test-project-1',
            notes: 'Test bookmark',
            createdAt: new Date().toISOString(),
            project: {
                id: 'test-project-1',
                title: 'Test Project',
                abstract: 'A test project for bookmark functionality',
                specialization: 'Computer Science',
                difficultyLevel: 'intermediate' as const,
                year: 2024,
                tags: ['test', 'bookmark'],
                technologyStack: ['React', 'TypeScript'],
                isGroupProject: false,
                approvalStatus: 'approved' as const,
                supervisor: {
                    id: 'test-supervisor',
                    name: 'Test Supervisor',
                    specializations: ['Computer Science']
                },
                viewCount: 1,
                bookmarkCount: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };

        useBookmarkStore.setState({
            bookmarks: [mockBookmark],
            categories: [{
                id: 'test-category',
                name: 'Test Category',
                description: 'A test category',
                bookmarkCount: 1
            }],
            isLoading: false,
            error: null
        });

        addTestResult('Mock data added to store');
    };

    const clearStore = () => {
        useBookmarkStore.setState({
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            isLoading: false,
            error: null,
            selectedBookmarks: []
        });
        addTestResult('Store cleared');
    };

    const clearResults = () => {
        setTestResults([]);
    };

    useEffect(() => {
        addTestResult('Component mounted');
        addTestResult(`Initial filtered bookmarks: ${filteredBookmarks.length}`);
    }, []);

    useEffect(() => {
        addTestResult(`Bookmarks updated: ${bookmarks.length} items`);
    }, [bookmarks]);

    useEffect(() => {
        addTestResult(`Filtered bookmarks updated: ${filteredBookmarks.length} items`);
    }, [filteredBookmarks]);

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="p-6">
                <h1 className="text-2xl font-bold mb-6">Bookmark Store Test Page</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div>
                        <h2 className="text-lg font-medium mb-4">Controls</h2>
                        <div className="space-y-2">
                            <Button onClick={testStore} className="w-full">
                                Run Store Test
                            </Button>
                            <Button onClick={clearStore} variant="secondary" className="w-full">
                                Clear Store
                            </Button>
                            <Button onClick={clearResults} variant="ghost" className="w-full">
                                Clear Results
                            </Button>
                        </div>
                        
                        <div className="mt-6">
                            <h3 className="font-medium mb-2">Current State</h3>
                            <div className="text-sm space-y-1">
                                <div>Bookmarks: {bookmarks.length}</div>
                                <div>Categories: {categories.length}</div>
                                <div>Filtered Bookmarks: {filteredBookmarks.length}</div>
                                <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                                <div>Error: {error || 'None'}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Test Results */}
                    <div>
                        <h2 className="text-lg font-medium mb-4">Test Results</h2>
                        <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
                            {testResults.length === 0 ? (
                                <p className="text-gray-500">No test results yet</p>
                            ) : (
                                <div className="space-y-1">
                                    {testResults.map((result, index) => (
                                        <div key={index} className="text-sm font-mono">
                                            {result}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Bookmarks Display */}
                {bookmarks.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-lg font-medium mb-4">Current Bookmarks</h2>
                        <div className="space-y-2">
                            {bookmarks.map((bookmark) => (
                                <Card key={bookmark.id} className="p-4">
                                    <h3 className="font-medium">{bookmark.project.title}</h3>
                                    <p className="text-sm text-gray-600">{bookmark.project.abstract}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Notes: {bookmark.notes || 'No notes'}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}