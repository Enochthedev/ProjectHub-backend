'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';
import UserTable from './UserTable';
import UserForm from './UserForm';
import type { User, UserFilters } from '@/stores/admin';

interface UserManagementProps {
  className?: string;
}

export default function UserManagement({ className }: UserManagementProps) {
  const {
    users,
    selectedUsers,
    userFilters,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    setUserFilters,
    selectUsers,
    bulkUpdateUsers,
    clearError,
    clearSelection,
  } = useAdminStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setUserFilters({ search: searchQuery });
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, setUserFilters]);

  const handleCreateUser = async (userData: Partial<User>) => {
    try {
      await createUser(userData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    
    try {
      await updateUser(editingUser.id, userData);
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      await toggleUserStatus(userId);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`
      : `Are you sure you want to ${action} ${selectedUsers.length} users?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (action === 'delete') {
        // Handle bulk delete
        for (const userId of selectedUsers) {
          await deleteUser(userId);
        }
      } else {
        await bulkUpdateUsers(selectedUsers, { 
          isActive: action === 'activate' 
        });
      }
      clearSelection();
    } catch (error) {
      console.error(`Failed to ${action} users:`, error);
    }
  };

  const handleExportUsers = async () => {
    try {
      // TODO: Implement export functionality
      console.log('Exporting users with filters:', userFilters);
    } catch (error) {
      console.error('Failed to export users:', error);
    }
  };

  const handleImportUsers = async (file: File) => {
    try {
      // TODO: Implement import functionality
      console.log('Importing users from file:', file.name);
    } catch (error) {
      console.error('Failed to import users:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (userFilters.role && user.role !== userFilters.role) return false;
    if (userFilters.status) {
      if (userFilters.status === 'active' && !user.isActive) return false;
      if (userFilters.status === 'inactive' && user.isActive) return false;
      if (userFilters.status === 'unverified' && user.isEmailVerified) return false;
    }
    return true;
  });

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchUsers(); }}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-black flex items-center">
              <Users className="w-6 h-6 mr-2" />
              User Management
            </h2>
            <p className="text-gray-600">
              Manage users, roles, and permissions across the platform.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={handleExportUsers}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => document.getElementById('import-file')?.click()}
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by name, email, or student ID..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="mt-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={userFilters.role || ''}
                  onChange={(e) => setUserFilters({ 
                    role: e.target.value as 'student' | 'supervisor' | 'admin' || undefined 
                  })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={userFilters.status || ''}
                  onChange={(e) => setUserFilters({ 
                    status: e.target.value as 'active' | 'inactive' | 'unverified' || undefined 
                  })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => setUserFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkAction('activate')}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
              >
                <UserX className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <UserTable
          users={filteredUsers}
          selectedUsers={selectedUsers}
          onSelectUsers={selectUsers}
          onEditUser={(user) => {
            setEditingUser(user);
            setShowEditModal(true);
          }}
          onDeleteUser={handleDeleteUser}
          onToggleStatus={handleToggleUserStatus}
        />
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="lg"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isLoading}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
        size="lg"
      >
        {editingUser && (
          <UserForm
            user={editingUser}
            onSubmit={handleUpdateUser}
            onCancel={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
            isLoading={isLoading}
          />
        )}
      </Modal>

      {/* Hidden file input for import */}
      <input
        id="import-file"
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportUsers(file);
          }
        }}
      />
    </div>
  );
}