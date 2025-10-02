'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookOpen, Search, Heart, TrendingUp, Users, Settings } from 'lucide-react';
import { dashboardApi, StudentDashboardData } from '@/lib/dashboard-api';
import { useBookmarkStore } from '@/stores/bookmark';
import { useDashboardStore } from '@/stores/dashboard';
import { useAuthStore } from '@/stores/auth';
import { 
  StudentDashboardWidgets, 
  DashboardCustomization, 
  RealTimeUpdates 
} from '@/components/features/dashboard';

export default function StudentDashboardPage() {
    const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCustomization, setShowCustomization] = useState(false);
    
    const { toggleBookmark } = useBookmarkStore();
    const { user } = useAuthStore();
    const {
        customization,
        setCustomization,
        resetCustomization,
        realTimeEnabled,
        metrics,
        setMetrics,
        handleRealTimeUpdate
    } = useDashboardStore();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const data = await dashboardApi.getStudentDashboard();
                setDashboardData(data);
                
                // Update metrics in dashboard store
                setMetrics({
                    projectProgress: data.currentProject?.progress?.percentage || 0,
                    milestonesCompleted: data.upcomingMilestones.filter(m => m.status === 'completed').length,
                    aiInteractions: data.aiConversations.length,
                    bookmarksCount: data.trendingProjects.filter(p => p.isBookmarked).length
                });
                
                setError(null);
            } catch (err) {
                setError('Failed to load dashboard data');
                console.error('Dashboard error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [setMetrics]);

    // Initialize customization for student role
    useEffect(() => {
        if (user && !customization) {
            resetCustomization('student');
        }
    }, [user, customization, resetCustomization]);

    const handleBookmarkToggle = async (project: any) => {
        try {
            await toggleBookmark(project);
            // Refresh dashboard data to update bookmark status
            const updatedData = await dashboardApi.getStudentDashboard();
            setDashboardData(updatedData);
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    };

    const handleCustomizationSave = (newCustomization: any) => {
        setCustomization(newCustomization);
    };

    const handleCustomizationReset = () => {
        resetCustomization('student');
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-6 w-32 mb-4" />
                            <Skeleton className="h-4 w-full mb-4" />
                            <Skeleton className="h-8 w-full" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-6 text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Real-time updates component */}
            <RealTimeUpdates
                onUpdate={handleRealTimeUpdate}
                refreshInterval={customization?.preferences.refreshInterval ? customization.preferences.refreshInterval * 1000 : 30000}
                enabled={realTimeEnabled}
                userId={user?.id}
                role="student"
            />

            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-black mb-2">Student Dashboard</h1>
                        <p className="text-gray-600">
                            Track your Final Year Project progress and get AI-powered assistance.
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => setShowCustomization(true)}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                    </Button>
                </div>
            </div>

            {/* Dashboard Widgets */}
            {dashboardData && customization && (
                <StudentDashboardWidgets
                    metrics={metrics}
                    recentActivity={dashboardData.recentActivity}
                    upcomingMilestones={dashboardData.upcomingMilestones}
                    aiConversations={dashboardData.aiConversations}
                    trendingProjects={dashboardData.trendingProjects}
                    currentProject={dashboardData.currentProject}
                />
            )}

            {/* Dashboard Customization Modal */}
            {customization && (
                <DashboardCustomization
                    customization={customization}
                    onSave={handleCustomizationSave}
                    onReset={handleCustomizationReset}
                    isOpen={showCustomization}
                    onClose={() => setShowCustomization(false)}
                />
            )}
        </div>
    );
}