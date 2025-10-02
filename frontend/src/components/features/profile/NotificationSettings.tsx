'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useProfileStore } from '@/stores/profile';
import { NotificationPreferences } from '@/types/auth';
import { Bell, Mail, Calendar, MessageSquare, TrendingUp, Megaphone, Save } from 'lucide-react';

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  milestoneReminders: true,
  projectUpdates: true,
  aiAssistantUpdates: false,
  weeklyDigest: true,
  marketingEmails: false,
};

export default function NotificationSettings() {
  const { 
    settings, 
    getSettings, 
    updateNotificationPreferences, 
    isSettingsLoading, 
    settingsError 
  } = useProfileStore();

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getSettings();
  }, [getSettings]);

  useEffect(() => {
    if (settings?.notificationPreferences) {
      setPreferences(settings.notificationPreferences);
    }
  }, [settings]);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateNotificationPreferences(preferences);
      setHasChanges(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleReset = () => {
    if (settings?.notificationPreferences) {
      setPreferences(settings.notificationPreferences);
      setHasChanges(false);
    }
  };

  const notificationOptions = [
    {
      key: 'emailNotifications' as keyof NotificationPreferences,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: Mail,
      category: 'General'
    },
    {
      key: 'milestoneReminders' as keyof NotificationPreferences,
      title: 'Milestone Reminders',
      description: 'Get reminded about upcoming milestone deadlines',
      icon: Calendar,
      category: 'Projects'
    },
    {
      key: 'projectUpdates' as keyof NotificationPreferences,
      title: 'Project Updates',
      description: 'Notifications about project status changes and new opportunities',
      icon: TrendingUp,
      category: 'Projects'
    },
    {
      key: 'aiAssistantUpdates' as keyof NotificationPreferences,
      title: 'AI Assistant Updates',
      description: 'Notifications about AI responses and conversation updates',
      icon: MessageSquare,
      category: 'AI Assistant'
    },
    {
      key: 'weeklyDigest' as keyof NotificationPreferences,
      title: 'Weekly Digest',
      description: 'Weekly summary of your activity and recommendations',
      icon: Bell,
      category: 'Digest'
    },
    {
      key: 'marketingEmails' as keyof NotificationPreferences,
      title: 'Marketing Emails',
      description: 'Product updates, tips, and promotional content',
      icon: Megaphone,
      category: 'Marketing'
    },
  ];

  const groupedOptions = notificationOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, typeof notificationOptions>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsError && (
            <div className="mb-4 p-3 border-2 border-black bg-gray-50 text-black text-sm">
              {settingsError}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedOptions).map(([category, options]) => (
              <div key={category}>
                <h3 className="font-medium text-black mb-3 text-sm uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-4">
                  {options.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <div key={option.key} className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <IconComponent className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-black text-sm">
                              {option.title}
                            </div>
                            <div className="text-gray-600 text-sm">
                              {option.description}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={preferences[option.key]}
                          onCheckedChange={(checked) => handlePreferenceChange(option.key, checked)}
                          disabled={isSettingsLoading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {hasChanges && (
            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              <Button 
                onClick={handleSave} 
                loading={isSettingsLoading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleReset}
                disabled={isSettingsLoading}
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Email Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Control how often you receive email notifications. You can always access all notifications in your dashboard.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-black text-sm">Instant</div>
                  <div className="text-gray-600 text-sm">Receive emails immediately when events occur</div>
                </div>
                <input 
                  type="radio" 
                  name="frequency" 
                  value="instant" 
                  defaultChecked
                  className="h-4 w-4 border-2 border-black"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-black text-sm">Daily Digest</div>
                  <div className="text-gray-600 text-sm">Receive a daily summary of all notifications</div>
                </div>
                <input 
                  type="radio" 
                  name="frequency" 
                  value="daily"
                  className="h-4 w-4 border-2 border-black"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-black text-sm">Weekly Digest</div>
                  <div className="text-gray-600 text-sm">Receive a weekly summary of all notifications</div>
                </div>
                <input 
                  type="radio" 
                  name="frequency" 
                  value="weekly"
                  className="h-4 w-4 border-2 border-black"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}