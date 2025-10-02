'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import ProfileForm from '@/components/features/profile/ProfileForm';
import SecuritySettings from '@/components/features/profile/SecuritySettings';
import NotificationSettings from '@/components/features/profile/NotificationSettings';
import PrivacySettings from '@/components/features/profile/PrivacySettings';
import { User, Mail, MapPin, Calendar, Edit3, Settings, Shield, Bell, Eye } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuthStore();
    const { getProfile, setActiveTab, activeTab, clearErrors } = useProfileStore();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user) {
            getProfile();
        }
        return () => clearErrors();
    }, [user, getProfile, clearErrors]);

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-6 text-center">
                    <p className="text-gray-600">Please log in to view your profile.</p>
                </Card>
            </div>
        );
    }

    const getProfileData = () => {
        if (user.role === 'student') {
            const profile = user.profile as Record<string, unknown>;
            return {
                name: profile?.firstName && profile?.lastName 
                    ? `${profile.firstName} ${profile.lastName}` 
                    : user.name || 'Student',
                email: user.email,
                role: 'Student',
                studentId: profile?.studentId || 'N/A',
                specialization: profile?.specialization || 'N/A',
                year: profile?.year || 'N/A',
                interests: profile?.interests || [],
                skills: profile?.skills || []
            };
        } else {
            const profile = user.profile as Record<string, unknown>;
            return {
                name: profile?.name || user.name || 'User',
                email: user.email,
                role: user.role === 'supervisor' ? 'Supervisor' : 'Admin',
                department: profile?.department || 'N/A',
                specializations: profile?.specializations || [],
                officeLocation: profile?.officeLocation || 'N/A'
            };
        }
    };

    const profileData = getProfileData();

    const handleEditSuccess = () => {
        setIsEditing(false);
        // Refresh user data from auth store
        window.location.reload();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-black mb-2">Profile & Settings</h1>
                <p className="text-gray-600">
                    Manage your account information, security, and preferences.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Profile Overview Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-6 sticky top-4">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-black text-white flex items-center justify-center text-2xl font-medium mx-auto mb-4">
                                {profileData.name[0].toUpperCase()}
                            </div>
                            <h2 className="text-xl font-medium text-black mb-1">{profileData.name}</h2>
                            <p className="text-gray-600">{profileData.role}</p>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center text-sm">
                                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                                <span className="text-gray-600 truncate">{profileData.email}</span>
                            </div>
                            
                            {user.role === 'student' && (
                                <>
                                    <div className="flex items-center text-sm">
                                        <User className="w-4 h-4 mr-3 text-gray-400" />
                                        <span className="text-gray-600">ID: {profileData.studentId}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                                        <span className="text-gray-600">Year {profileData.year}</span>
                                    </div>
                                </>
                            )}
                            
                            {user.role !== 'student' && profileData.officeLocation && (
                                <div className="flex items-center text-sm">
                                    <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                                    <span className="text-gray-600">{profileData.officeLocation}</span>
                                </div>
                            )}
                        </div>
                        
                        <Button 
                            className="w-full" 
                            variant="secondary"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {isEditing ? (
                        <ProfileForm 
                            onCancel={() => setIsEditing(false)}
                            onSuccess={handleEditSuccess}
                        />
                    ) : (
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="profile" className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Profile
                                </TabsTrigger>
                                <TabsTrigger value="security" className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Security
                                </TabsTrigger>
                                <TabsTrigger value="notifications" className="flex items-center gap-2">
                                    <Bell className="w-4 h-4" />
                                    Notifications
                                </TabsTrigger>
                                <TabsTrigger value="privacy" className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Privacy
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile" className="mt-6">
                                <div className="space-y-6">
                                    <Card className="p-6">
                                        <h3 className="font-medium text-black mb-4">Personal Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Full Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={profileData.name}
                                                    disabled
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email Address
                                                </label>
                                                <Input
                                                    type="email"
                                                    value={profileData.email}
                                                    disabled
                                                />
                                            </div>
                                            
                                            {user.role === 'student' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Student ID
                                                        </label>
                                                        <Input
                                                            type="text"
                                                            value={profileData.studentId}
                                                            disabled
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Specialization
                                                        </label>
                                                        <Input
                                                            type="text"
                                                            value={profileData.specialization}
                                                            disabled
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>

                                    {user.role === 'student' && (
                                        <>
                                            <Card className="p-6">
                                                <h3 className="font-medium text-black mb-4">Interests</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {profileData.interests.length > 0 ? (
                                                        profileData.interests.map((interest: string, index: number) => (
                                                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm border border-gray-200">
                                                                {interest}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-500 text-sm">No interests specified</p>
                                                    )}
                                                </div>
                                            </Card>

                                            <Card className="p-6">
                                                <h3 className="font-medium text-black mb-4">Skills</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {profileData.skills.length > 0 ? (
                                                        profileData.skills.map((skill: string, index: number) => (
                                                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm border border-gray-200">
                                                                {skill}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-500 text-sm">No skills specified</p>
                                                    )}
                                                </div>
                                            </Card>
                                        </>
                                    )}

                                    {user.role !== 'student' && (
                                        <Card className="p-6">
                                            <h3 className="font-medium text-black mb-4">Specializations</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {profileData.specializations.length > 0 ? (
                                                    profileData.specializations.map((spec: string, index: number) => (
                                                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm border border-gray-200">
                                                            {spec}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-500 text-sm">No specializations specified</p>
                                                )}
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="mt-6">
                                <SecuritySettings />
                            </TabsContent>

                            <TabsContent value="notifications" className="mt-6">
                                <NotificationSettings />
                            </TabsContent>

                            <TabsContent value="privacy" className="mt-6">
                                <PrivacySettings />
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}