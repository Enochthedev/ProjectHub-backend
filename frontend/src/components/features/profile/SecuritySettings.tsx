'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useProfileStore } from '@/stores/profile';
import { useAuthStore } from '@/stores/auth';
import { ChangePasswordData } from '@/types/auth';
import { Lock, Trash2, Download, AlertTriangle } from 'lucide-react';

interface PasswordFormData extends ChangePasswordData {
  confirmPassword: string;
}

interface DeleteAccountFormData {
  password: string;
  confirmText: string;
}

export default function SecuritySettings() {
  const { changePassword, deleteAccount, exportData, isProfileLoading, profileError } = useProfileStore();
  const { logout } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const passwordForm = useForm<PasswordFormData>();
  const deleteForm = useForm<DeleteAccountFormData>();

  const onChangePassword = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }

    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      passwordForm.reset();
      setShowPasswordForm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const onDeleteAccount = async (data: DeleteAccountFormData) => {
    if (data.confirmText !== 'DELETE') {
      deleteForm.setError('confirmText', {
        type: 'manual',
        message: 'Please type DELETE to confirm'
      });
      return;
    }

    try {
      await deleteAccount(data.password);
      logout();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleExportData = async () => {
    try {
      const downloadUrl = await exportData();
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'my-data-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Keep your account secure by using a strong password and changing it regularly.
              </p>
              <Button onClick={() => setShowPasswordForm(true)}>
                Change Password
              </Button>
            </div>
          ) : (
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              {profileError && (
                <div className="p-3 border-2 border-black bg-gray-50 text-black text-sm">
                  {profileError}
                </div>
              )}
              
              <Input
                type="password"
                label="Current Password"
                {...passwordForm.register('currentPassword', { 
                  required: 'Current password is required' 
                })}
                error={passwordForm.formState.errors.currentPassword?.message}
              />
              
              <Input
                type="password"
                label="New Password"
                {...passwordForm.register('newPassword', { 
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                error={passwordForm.formState.errors.newPassword?.message}
              />
              
              <Input
                type="password"
                label="Confirm New Password"
                {...passwordForm.register('confirmPassword', { 
                  required: 'Please confirm your new password' 
                })}
                error={passwordForm.formState.errors.confirmPassword?.message}
              />
              
              <div className="flex gap-3">
                <Button type="submit" loading={isProfileLoading}>
                  Update Password
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowPasswordForm(false);
                    passwordForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Download a copy of all your data including profile information, projects, bookmarks, and AI conversations.
            </p>
            <Button onClick={handleExportData} loading={isProfileLoading}>
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Trash2 className="w-5 h-5" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border-2 border-gray-300 bg-gray-50">
              <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  This action cannot be undone
                </p>
                <p className="text-gray-600 text-sm">
                  Deleting your account will permanently remove all your data, including projects, bookmarks, and AI conversations.
                </p>
              </div>
            </div>
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <form onSubmit={deleteForm.handleSubmit(onDeleteAccount)} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border-2 border-black bg-gray-50">
              <AlertTriangle className="w-5 h-5 text-black mt-0.5" />
              <div>
                <p className="font-medium text-black text-sm">
                  Are you absolutely sure?
                </p>
                <p className="text-gray-600 text-sm">
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            {profileError && (
              <div className="p-3 border-2 border-black bg-gray-50 text-black text-sm">
                {profileError}
              </div>
            )}

            <Input
              type="password"
              label="Enter your password to confirm"
              {...deleteForm.register('password', { 
                required: 'Password is required' 
              })}
              error={deleteForm.formState.errors.password?.message}
            />

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Type <strong>DELETE</strong> to confirm
              </label>
              <Input
                {...deleteForm.register('confirmText', { 
                  required: 'Please type DELETE to confirm' 
                })}
                error={deleteForm.formState.errors.confirmText?.message}
                placeholder="DELETE"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              variant="danger" 
              loading={isProfileLoading}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setShowDeleteModal(false);
                deleteForm.reset();
              }}
              disabled={isProfileLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}