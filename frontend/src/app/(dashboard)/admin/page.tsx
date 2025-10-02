'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, FileText, Settings, BarChart3, Shield, Database, Bot, Activity, Wrench } from 'lucide-react';
import Link from 'next/link';
import { dashboardApi, AdminDashboardData } from '@/lib/dashboard-api';
import { useDashboardStore } from '@/stores/dashboard';
import { useAuthStore } from '@/stores/auth';
import { 
  AdminDashboardWidgets, 
  DashboardCustomization, 
  RealTimeUpdates 
} from '@/components/features/dashboard';

export default function AdminDashboardPage() {
    const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCustomization, setShowCustomization] = useState(false);
    
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
                const data = await dashboardApi.getAdminDashboard();
                setDashboardData(data);
                
                // Update metrics in dashboard store
                setMetrics({
                    totalUsers: data.platformStatistics.totalUsers,
                    activeProjects: data.platformStatistics.activeProjects,
                    pendingApprovals: data.platformStatistics.pendingApprovals,
                    systemHealth: data.platformStatistics.systemHealth
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

    // Initialize customization for admin role
    useEffect(() => {
        if (user && !customization) {
            resetCustomization('admin');
        }
    }, [user, customization, resetCustomization]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {[...Array(6)].map((_, i) => (
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

    const handleCustomizationSave = (newCustomization: any) => {
        setCustomization(newCustomization);
    };

    const handleCustomizationReset = () => {
        resetCustomization('admin');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Real-time updates component */}
            <RealTimeUpdates
                onUpdate={handleRealTimeUpdate}
                refreshInterval={customization?.preferences.refreshInterval ? customization.preferences.refreshInterval * 1000 : 30000}
                enabled={realTimeEnabled}
                userId={user?.id}
                role="admin"
            />

            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-black mb-2">Admin Dashboard</h1>
                        <p className="text-gray-600">
                            Manage the ProjectHub platform and oversee all activities.
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Link href="/admin/users">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <Users className="w-8 h-8 text-blue-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">User Management</h3>
                                <p className="text-gray-600 text-sm">Manage users, roles, and permissions</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/projects">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <FileText className="w-8 h-8 text-green-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">Project Approval</h3>
                                <p className="text-gray-600 text-sm">Review and approve project submissions</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/ai">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <Bot className="w-8 h-8 text-purple-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">AI Management</h3>
                                <p className="text-gray-600 text-sm">Configure AI services and knowledge base</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/analytics">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <BarChart3 className="w-8 h-8 text-orange-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">Platform Analytics</h3>
                                <p className="text-gray-600 text-sm">View usage metrics and growth data</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/system">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <Activity className="w-8 h-8 text-red-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">System Health</h3>
                                <p className="text-gray-600 text-sm">Monitor system performance and status</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/admin/bulk-operations">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="flex items-center">
                            <Database className="w-8 h-8 text-gray-600 mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold text-black">Bulk Operations</h3>
                                <p className="text-gray-600 text-sm">Manage data imports, exports, and migrations</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* System Status Overview */}
            {dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Users</p>
                                <p className="text-2xl font-bold text-black">{dashboardData.platformStatistics.totalUsers}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                                <p className="text-2xl font-bold text-black">{dashboardData.platformStatistics.activeProjects}</p>
                            </div>
                            <FileText className="w-8 h-8 text-green-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                                <p className="text-2xl font-bold text-black">{dashboardData.platformStatistics.pendingApprovals}</p>
                            </div>
                            <Shield className="w-8 h-8 text-orange-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">System Health</p>
                                <p className="text-2xl font-bold text-black">{dashboardData.platformStatistics.systemHealth}%</p>
                            </div>
                            <Activity className="w-8 h-8 text-red-600" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Dashboard Widgets */}
            {dashboardData && customization && (
                <AdminDashboardWidgets
                    metrics={metrics}
                    platformStatistics={dashboardData.platformStatistics}
                    recentActivity={dashboardData.recentActivity}
                    systemHealth={dashboardData.platformStatistics}
                    userGrowth={dashboardData.userGrowth}
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