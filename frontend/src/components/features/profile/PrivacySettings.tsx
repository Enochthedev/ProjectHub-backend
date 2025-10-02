'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useProfileStore } from '@/stores/profile';
import { PrivacySettings as PrivacySettingsType } from '@/types/auth';
import { Shield, Eye, Mail, MessageSquare, Database, Save } from 'lucide-react';

const defaultPrivacySettings: PrivacySettingsType = {
  profileVisibility: 'public',
  showEmail: false,
  showProjects: true,
  allowDirectMessages: true,
  dataProcessingConsent: true,
};

const visibilityOptions = [
  { value: 'public', label: 'Public - Visible to everyone' },
  { value: 'private', label: 'Private - Only visible to you' },
  { value: 'contacts', label: 'Contacts - Visible to supervisors and collaborators' },
];

export default function PrivacySettings() {
  const { 
    settings, 
    getSettings, 
    updatePrivacySettings, 
    isSettingsLoading, 
    settingsError 
  } = useProfileStore();

  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsType>(defaultPrivacySettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getSettings();
  }, [getSettings]);

  useEffect(() => {
    if (settings?.privacySettings) {
      setPrivacySettings(settings.privacySettings);
    }
  }, [settings]);

  const handleSettingChange = (key: keyof PrivacySettingsType, value: boolean | string) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePrivacySettings(privacySettings);
      setHasChanges(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleReset = () => {
    if (settings?.privacySettings) {
      setPrivacySettings(settings.privacySettings);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsError && (
            <div className="mb-4 p-3 border-2 border-black bg-gray-50 text-black text-sm">
              {settingsError}
            </div>
          )}

          <div className="space-y-6">
            {/* Profile Visibility */}
            <div>
              <h3 className="font-medium text-black mb-3 text-sm uppercase tracking-wide">
                Profile Visibility
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <Select
                      label="Who can see your profile"
                      value={privacySettings.profileVisibility}
                      onValueChange={(value) => handleSettingChange('profileVisibility', value as 'public' | 'private' | 'contacts')}
                      options={visibilityOptions}
                      disabled={isSettingsLoading}
                    />
                    <p className="text-gray-600 text-sm mt-2">
                      Control who can view your profile information and activity.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-medium text-black mb-3 text-sm uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-black text-sm">
                        Show Email Address
                      </div>
                      <div className="text-gray-600 text-sm">
                        Allow others to see your email address on your profile
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.showEmail}
                    onCheckedChange={(checked) => handleSettingChange('showEmail', checked)}
                    disabled={isSettingsLoading}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-black text-sm">
                        Allow Direct Messages
                      </div>
                      <div className="text-gray-600 text-sm">
                        Let other users send you direct messages through the platform
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.allowDirectMessages}
                    onCheckedChange={(checked) => handleSettingChange('allowDirectMessages', checked)}
                    disabled={isSettingsLoading}
                  />
                </div>
              </div>
            </div>

            {/* Activity & Projects */}
            <div>
              <h3 className="font-medium text-black mb-3 text-sm uppercase tracking-wide">
                Activity & Projects
              </h3>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Database className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-black text-sm">
                        Show Projects
                      </div>
                      <div className="text-gray-600 text-sm">
                        Display your projects and contributions on your profile
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.showProjects}
                    onCheckedChange={(checked) => handleSettingChange('showProjects', checked)}
                    disabled={isSettingsLoading}
                  />
                </div>
              </div>
            </div>

            {/* Data Processing */}
            <div>
              <h3 className="font-medium text-black mb-3 text-sm uppercase tracking-wide">
                Data Processing
              </h3>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-black text-sm">
                        Data Processing Consent
                      </div>
                      <div className="text-gray-600 text-sm">
                        Allow us to process your data to improve recommendations and platform features
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.dataProcessingConsent}
                    onCheckedChange={(checked) => handleSettingChange('dataProcessingConsent', checked)}
                    disabled={isSettingsLoading}
                  />
                </div>
              </div>
            </div>
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

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border-2 border-gray-200 bg-gray-50">
              <h4 className="font-medium text-black text-sm mb-2">How we protect your data</h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• All data is encrypted in transit and at rest</li>
                <li>• We never share your personal information with third parties</li>
                <li>• You can export or delete your data at any time</li>
                <li>• We comply with GDPR and other privacy regulations</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button variant="secondary" size="sm">
                Privacy Policy
              </Button>
              <Button variant="secondary" size="sm">
                Terms of Service
              </Button>
              <Button variant="secondary" size="sm">
                Data Processing Agreement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}