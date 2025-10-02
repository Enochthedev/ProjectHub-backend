'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfileStore } from '@/stores/profile';
import { Settings, Globe, Clock, Palette, Save, RefreshCw } from 'lucide-react';

interface GeneralSettingsForm {
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'system';
}

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
];

const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const THEMES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

export default function SettingsPage() {
    const { 
        settings, 
        getSettings, 
        updateGeneralSettings, 
        isSettingsLoading, 
        settingsError,
        clearErrors
    } = useProfileStore();

    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const form = useForm<GeneralSettingsForm>({
        defaultValues: {
            language: 'en',
            timezone: 'UTC',
            theme: 'system',
        }
    });

    useEffect(() => {
        getSettings();
        return () => clearErrors();
    }, [getSettings, clearErrors]);

    useEffect(() => {
        if (settings) {
            form.reset({
                language: settings.language || 'en',
                timezone: settings.timezone || 'UTC',
                theme: settings.theme || 'system',
            });
        }
    }, [settings, form]);

    const watchedValues = form.watch();

    useEffect(() => {
        if (settings) {
            const hasChanged = 
                watchedValues.language !== (settings.language || 'en') ||
                watchedValues.timezone !== (settings.timezone || 'UTC') ||
                watchedValues.theme !== (settings.theme || 'system');
            setHasChanges(hasChanged);
        }
    }, [watchedValues, settings]);

    const onSubmit = async (data: GeneralSettingsForm) => {
        try {
            await updateGeneralSettings(data);
            setHasChanges(false);
        } catch (error) {
            // Error handled by store
        }
    };

    const handleReset = () => {
        if (settings) {
            form.reset({
                language: settings.language || 'en',
                timezone: settings.timezone || 'UTC',
                theme: settings.theme || 'system',
            });
            setHasChanges(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-black mb-2">Application Settings</h1>
                <p className="text-gray-600">
                    Configure your application preferences and regional settings.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Appearance
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Advanced
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {settingsError && (
                            <div className="p-3 border-2 border-black bg-gray-50 text-black text-sm">
                                {settingsError}
                            </div>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5" />
                                    Language & Region
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Language"
                                        value={form.watch('language')}
                                        onValueChange={(value) => form.setValue('language', value)}
                                        options={LANGUAGES}
                                        disabled={isSettingsLoading}
                                    />
                                    <Select
                                        label="Timezone"
                                        value={form.watch('timezone')}
                                        onValueChange={(value) => form.setValue('timezone', value)}
                                        options={TIMEZONES}
                                        disabled={isSettingsLoading}
                                    />
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Language changes will be applied after refreshing the page. Timezone affects how dates and times are displayed throughout the application.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="w-5 h-5" />
                                    Theme Preferences
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select
                                    label="Theme"
                                    value={form.watch('theme')}
                                    onValueChange={(value) => form.setValue('theme', value as 'light' | 'dark' | 'system')}
                                    options={THEMES}
                                    disabled={isSettingsLoading}
                                />
                                <p className="text-gray-600 text-sm">
                                    Choose your preferred theme. System will automatically match your device's theme setting.
                                </p>
                            </CardContent>
                        </Card>

                        {hasChanges && (
                            <div className="flex gap-3 p-4 border-2 border-gray-200 bg-gray-50">
                                <Button 
                                    type="submit" 
                                    loading={isSettingsLoading}
                                    className="flex-1"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                                <Button 
                                    type="button"
                                    variant="secondary" 
                                    onClick={handleReset}
                                    disabled={isSettingsLoading}
                                >
                                    Reset
                                </Button>
                            </div>
                        )}
                    </form>
                </TabsContent>

                <TabsContent value="appearance" className="mt-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Display Preferences</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Compact Mode</div>
                                            <div className="text-gray-600 text-sm">Reduce spacing and padding for a more compact interface</div>
                                        </div>
                                        <Switch disabled />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">High Contrast</div>
                                            <div className="text-gray-600 text-sm">Increase contrast for better accessibility</div>
                                        </div>
                                        <Switch disabled />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Animations</div>
                                            <div className="text-gray-600 text-sm">Enable smooth transitions and animations</div>
                                        </div>
                                        <Switch defaultChecked disabled />
                                    </div>
                                </div>
                                
                                <div className="p-3 border-2 border-gray-200 bg-gray-50">
                                    <p className="text-gray-600 text-sm">
                                        <strong>Note:</strong> This application uses a black and white design system. Additional appearance customization options may be added in future updates.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance & Data</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Enable Caching</div>
                                            <div className="text-gray-600 text-sm">Cache data locally to improve performance</div>
                                        </div>
                                        <Switch defaultChecked disabled />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Preload Content</div>
                                            <div className="text-gray-600 text-sm">Preload content in the background for faster navigation</div>
                                        </div>
                                        <Switch defaultChecked disabled />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Analytics</div>
                                            <div className="text-gray-600 text-sm">Help improve the application by sharing anonymous usage data</div>
                                        </div>
                                        <Switch defaultChecked disabled />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Developer Options</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">Debug Mode</div>
                                            <div className="text-gray-600 text-sm">Show additional debugging information</div>
                                        </div>
                                        <Switch disabled />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-black text-sm">API Logging</div>
                                            <div className="text-gray-600 text-sm">Log API requests and responses to browser console</div>
                                        </div>
                                        <Switch disabled />
                                    </div>
                                </div>
                                
                                <div className="p-3 border-2 border-gray-200 bg-gray-50">
                                    <p className="text-gray-600 text-sm">
                                        <strong>Warning:</strong> Developer options are intended for debugging purposes only and may affect application performance.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Reset & Maintenance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <Button variant="secondary" size="sm" disabled>
                                        Clear Cache
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled>
                                        Reset All Settings
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled>
                                        Download Debug Log
                                    </Button>
                                </div>
                                
                                <div className="p-3 border-2 border-gray-200 bg-gray-50">
                                    <p className="text-gray-600 text-sm">
                                        These maintenance options will be available in a future update.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}