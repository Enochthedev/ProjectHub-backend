'use client';

import React, { useEffect } from 'react';
import { useBookmarkStore } from '@/stores/bookmark';
import { SimpleBookmarkGrid } from './SimpleBookmarkGrid';
import { ComparisonButton } from './ProjectComparison';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for demonstration
const mockBookmarksData = [
    {
        id: 'bookmark-1',
        projectId: 'project-1',
        notes: 'Interesting React project with modern architecture',
        createdAt: '2024-01-01T00:00:00Z',
        category: {
            id: 'category-1',
            name: 'Frontend Projects',
            description: 'Projects focused on frontend development',
            bookmarkCount: 3
        },
        project: {
            id: 'project-1',
            title: 'React Dashboard with TypeScript',
            abstract: 'A comprehensive dashboard application built with React, TypeScript, and modern UI libraries. Features include data visualization, user management, and real-time updates.',
            specialization: 'Computer Science',
            difficultyLevel: 'intermediate' as const,
            year: 2024,
            tags: ['react', 'typescript', 'dashboard', 'ui'],
            technologyStack: ['React', 'TypeScript', 'Tailwind CSS', 'Chart.js'],
            isGroupProject: false,
            approvalStatus: 'approved' as const,
            supervisor: {
                id: 'supervisor-1',
                name: 'Dr. Sarah Smith',
                specializations: ['Computer Science', 'Web Development']
            },
            viewCount: 150,
            bookmarkCount: 25,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            githubUrl: 'https://github.com/example/react-dashboard',
            demoUrl: 'https://demo.example.com/dashboard'
        }
    },
    {
        id: 'bookmark-2',
        projectId: 'project-2',
        notes: 'Great example of Vue.js e-commerce implementation',
        createdAt: '2024-01-02T00:00:00Z',
        category: {
            id: 'category-1',
            name: 'Frontend Projects',
            description: 'Projects focused on frontend development',
            bookmarkCount: 3
        },
        project: {
            id: 'project-2',
            title: 'Vue.js E-commerce Platform',
            abstract: 'A full-featured e-commerce platform built with Vue.js, featuring product catalog, shopping cart, payment integration, and admin dashboard.',
            specialization: 'Software Engineering',
            difficultyLevel: 'advanced' as const,
            year: 2024,
            tags: ['vue', 'javascript', 'ecommerce', 'payment'],
            technologyStack: ['Vue.js', 'JavaScript', 'Node.js', 'MongoDB'],
            isGroupProject: true,
            approvalStatus: 'approved' as const,
            supervisor: {
                id: 'supervisor-2',
                name: 'Dr. Michael Johnson',
                specializations: ['Software Engineering', 'E-commerce']
            },
            viewCount: 200,
            bookmarkCount: 40,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
            githubUrl: 'https://github.com/example/vue-ecommerce'
        }
    },
    {
        id: 'bookmark-3',
        projectId: 'project-3',
        notes: 'Excellent mobile app architecture',
        createdAt: '2024-01-03T00:00:00Z',
        category: {
            id: 'category-2',
            name: 'Mobile Development',
            description: 'Mobile application projects',
            bookmarkCount: 2
        },
        project: {
            id: 'project-3',
            title: 'React Native Social Media App',
            abstract: 'A cross-platform social media application built with React Native, featuring real-time messaging, photo sharing, and social networking features.',
            specialization: 'Mobile Development',
            difficultyLevel: 'advanced' as const,
            year: 2024,
            tags: ['react-native', 'mobile', 'social', 'realtime'],
            technologyStack: ['React Native', 'TypeScript', 'Firebase', 'Redux'],
            isGroupProject: true,
            approvalStatus: 'approved' as const,
            supervisor: {
                id: 'supervisor-3',
                name: 'Dr. Emily Chen',
                specializations: ['Mobile Development', 'Social Computing']
            },
            viewCount: 180,
            bookmarkCount: 35,
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z',
            githubUrl: 'https://github.com/example/rn-social-app'
        }
    }
];

const mockCategories = [
    {
        id: 'category-1',
        name: 'Frontend Projects',
        description: 'Projects focused on frontend development',
        bookmarkCount: 2
    },
    {
        id: 'category-2',
        name: 'Mobile Development',
        description: 'Mobile application projects',
        bookmarkCount: 1
    }
];

export const BookmarkDemo: React.FC = () => {
    const { bookmarks, categories, isLoading } = useBookmarkStore();

    const loadDemoData = () => {
        useBookmarkStore.setState({
            bookmarks: mockBookmarksData,
            categories: mockCategories,
            isLoading: false,
            error: null
        });
    };

    const clearData = () => {
        useBookmarkStore.setState({
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            isLoading: false,
            error: null
        });
    };

    useEffect(() => {
        // Auto-load demo data if no bookmarks exist
        if (bookmarks.length === 0 && categories.length === 0 && !isLoading) {
            loadDemoData();
        }
    }, [bookmarks.length, categories.length, isLoading]);

    return (
        <div className="space-y-6">
            {/* Demo Controls */}
            <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-yellow-800">Bookmark System Demo</h3>
                        <p className="text-sm text-yellow-700">
                            This is a demonstration of the bookmark management system with mock data.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={loadDemoData}>
                            Load Demo Data
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearData}>
                            Clear Data
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Bookmark Grid */}
            <SimpleBookmarkGrid />
            
            {/* Comparison Button */}
            <ComparisonButton />
        </div>
    );
};