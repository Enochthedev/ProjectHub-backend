'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();

    useEffect(() => {
        if (user && !isLoading) {
            // Redirect to role-specific dashboard immediately
            switch (user.role) {
                case 'student':
                    router.replace('/student');
                    break;
                case 'supervisor':
                    router.replace('/supervisor');
                    break;
                case 'admin':
                    router.replace('/admin');
                    break;
                default:
                    // Stay on this page if role is unknown
                    break;
            }
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-6">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-6 text-center">
                    <h1 className="text-2xl font-bold mb-4">Welcome to ProjectHub</h1>
                    <p className="text-gray-600 mb-6">
                        Please log in to access your dashboard.
                    </p>
                </Card>
            </div>
        );
    }

    // Fallback if role is not recognized - show loading state
    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="p-6">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </Card>
        </div>
    );
}