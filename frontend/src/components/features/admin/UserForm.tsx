'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { User } from '@/stores/admin';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: Partial<User>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  email: string;
  role: 'student' | 'supervisor' | 'admin';
  isActive: boolean;
  profile: {
    firstName: string;
    lastName: string;
    name: string;
    studentId: string;
    specialization: string;
    year: number | '';
    specializations: string[];
    isAvailable: boolean;
    capacity: number | '';
  };
  sendWelcomeEmail: boolean;
}

const SPECIALIZATIONS = [
  'Software Engineering',
  'Data Science & Analytics',
  'Cybersecurity',
  'Artificial Intelligence & Machine Learning',
  'Web Development',
  'Mobile App Development',
  'Game Development',
  'Human-Computer Interaction',
  'Database Systems & Management',
  'Network Systems & Administration',
];

export default function UserForm({ user, onSubmit, onCancel, isLoading }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: 'student',
    isActive: true,
    profile: {
      firstName: '',
      lastName: '',
      name: '',
      studentId: '',
      specialization: '',
      year: '',
      specializations: [],
      isAvailable: true,
      capacity: '',
    },
    sendWelcomeEmail: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        profile: {
          firstName: user.profile.firstName || '',
          lastName: user.profile.lastName || '',
          name: user.profile.name || '',
          studentId: user.profile.studentId || '',
          specialization: user.profile.specialization || '',
          year: user.profile.year || '',
          specializations: user.profile.specializations || [],
          isAvailable: user.profile.isAvailable ?? true,
          capacity: user.profile.capacity || '',
        },
        sendWelcomeEmail: false, // Don't send welcome email for existing users
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.role === 'student') {
      if (!formData.profile.firstName) {
        newErrors.firstName = 'First name is required for students';
      }
      if (!formData.profile.lastName) {
        newErrors.lastName = 'Last name is required for students';
      }
      if (!formData.profile.studentId) {
        newErrors.studentId = 'Student ID is required for students';
      }
      if (!formData.profile.specialization) {
        newErrors.specialization = 'Specialization is required for students';
      }
      if (!formData.profile.year) {
        newErrors.year = 'Year is required for students';
      }
    }

    if (formData.role === 'supervisor') {
      if (!formData.profile.name) {
        newErrors.name = 'Name is required for supervisors';
      }
      if (formData.profile.specializations.length === 0) {
        newErrors.specializations = 'At least one specialization is required for supervisors';
      }
      if (!formData.profile.capacity) {
        newErrors.capacity = 'Capacity is required for supervisors';
      }
    }

    if (formData.role === 'admin') {
      if (!formData.profile.name) {
        newErrors.name = 'Name is required for admins';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const userData: Partial<User> = {
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        profile: {
          ...formData.profile,
          year: formData.profile.year ? Number(formData.profile.year) : undefined,
          capacity: formData.profile.capacity ? Number(formData.profile.capacity) : undefined,
        },
      };

      await onSubmit(userData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleSpecializationToggle = (specialization: string) => {
    const current = formData.profile.specializations;
    const updated = current.includes(specialization)
      ? current.filter(s => s !== specialization)
      : [...current, specialization];
    
    setFormData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        specializations: updated,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-black mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              error={errors.email}
              disabled={!!user} // Don't allow email changes for existing users
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                role: e.target.value as 'student' | 'supervisor' | 'admin' 
              }))}
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
            >
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
            />
            <span className="ml-2 text-sm text-gray-700">Active User</span>
          </label>
          
          {!user && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, sendWelcomeEmail: e.target.checked }))}
                className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
              />
              <span className="ml-2 text-sm text-gray-700">Send Welcome Email</span>
            </label>
          )}
        </div>
      </Card>

      {/* Role-specific Information */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-black mb-4">Profile Information</h3>
        
        {formData.role === 'student' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  value={formData.profile.firstName}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, firstName: value }
                  }))}
                  error={errors.firstName}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  value={formData.profile.lastName}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, lastName: value }
                  }))}
                  error={errors.lastName}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID *
                </label>
                <Input
                  value={formData.profile.studentId}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, studentId: value }
                  }))}
                  error={errors.studentId}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <select
                  value={formData.profile.year}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, year: e.target.value ? Number(e.target.value) : '' }
                  }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  <option value="">Select Year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">{errors.year}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization *
              </label>
              <select
                value={formData.profile.specialization}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  profile: { ...prev.profile, specialization: e.target.value }
                }))}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
              >
                <option value="">Select Specialization</option>
                {SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              {errors.specialization && (
                <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>
              )}
            </div>
          </div>
        )}

        {formData.role === 'supervisor' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                value={formData.profile.name}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  profile: { ...prev.profile, name: value }
                }))}
                error={errors.name}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specializations *
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SPECIALIZATIONS.map((spec) => (
                  <label key={spec} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.profile.specializations.includes(spec)}
                      onChange={() => handleSpecializationToggle(spec)}
                      className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
                    />
                    <span className="ml-2 text-sm text-gray-700">{spec}</span>
                  </label>
                ))}
              </div>
              {errors.specializations && (
                <p className="mt-1 text-sm text-red-600">{errors.specializations}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Capacity *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.profile.capacity.toString()}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, capacity: value ? Number(value) : '' }
                  }))}
                  error={errors.capacity}
                />
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.profile.isAvailable}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile: { ...prev.profile, isAvailable: e.target.checked }
                    }))}
                    className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
                  />
                  <span className="ml-2 text-sm text-gray-700">Available for New Students</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {formData.role === 'admin' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              value={formData.profile.name}
              onChange={(value) => setFormData(prev => ({
                ...prev,
                profile: { ...prev.profile, name: value }
              }))}
              error={errors.name}
            />
          </div>
        )}
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
        >
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}