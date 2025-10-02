'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  MoreHorizontal,
  Mail,
  Calendar
} from 'lucide-react';
import type { User } from '@/stores/admin';

interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onSelectUsers: (userIds: string[]) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
}

export default function UserTable({
  users,
  selectedUsers,
  onSelectUsers,
  onEditUser,
  onDeleteUser,
  onToggleStatus,
}: UserTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectUsers(users.map(user => user.id));
    } else {
      onSelectUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectUsers([...selectedUsers, userId]);
    } else {
      onSelectUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      case 'student':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (user: User) => {
    if (!user.isEmailVerified) return 'warning';
    if (!user.isActive) return 'destructive';
    return 'success';
  };

  const getStatusText = (user: User) => {
    if (!user.isEmailVerified) return 'Unverified';
    if (!user.isActive) return 'Inactive';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.profile.firstName && user.profile.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    if (user.profile.name) {
      return user.profile.name;
    }
    return user.email.split('@')[0];
  };

  if (users.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No users found</h3>
          <p>No users match your current filters.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                User
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Specialization
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Created
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 ${
                  selectedUsers.includes(user.id) ? 'bg-gray-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-600">
                        {getUserDisplayName(user).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      {user.profile.studentId && (
                        <div className="text-xs text-gray-400">
                          ID: {user.profile.studentId}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(user)}>
                    {getStatusText(user)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {user.profile.specialization || 
                     (user.profile.specializations && user.profile.specializations.length > 0 
                       ? user.profile.specializations.join(', ') 
                       : '-')}
                  </div>
                  {user.profile.year && (
                    <div className="text-xs text-gray-500">
                      Year {user.profile.year}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(user.id)}
                      title={user.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.isActive ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditUser(user)}
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteUser(user.id)}
                      title="Delete user"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}