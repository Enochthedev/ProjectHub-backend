'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useProfileStore } from '@/stores/profile';
import { useAuthStore } from '@/stores/auth';
import { User, StudentProfile, SupervisorProfile, UpdateProfileData } from '@/types/auth';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface ProfileFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface StudentFormData {
  firstName: string;
  lastName: string;
  specialization: string;
  year: number;
  interests: string[];
  skills: string[];
}

interface SupervisorFormData {
  name: string;
  specializations: string[];
  capacity: number;
  isAvailable: boolean;
}

const SPECIALIZATIONS = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Web Development',
  'Mobile Development',
  'Game Development',
  'Machine Learning',
  'Database Systems',
  'Network Engineering',
  'Information Systems'
];

const YEARS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: '5', label: 'Year 5' }
];

export default function ProfileForm({ onCancel, onSuccess }: ProfileFormProps) {
  const { user } = useAuthStore();
  const { updateProfile, isProfileLoading, profileError } = useProfileStore();
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');

  const isStudent = user?.role === 'student';
  const profile = user?.profile as StudentProfile | SupervisorProfile;

  // Student form
  const studentForm = useForm<StudentFormData>({
    defaultValues: {
      firstName: isStudent ? (profile as StudentProfile)?.firstName || '' : '',
      lastName: isStudent ? (profile as StudentProfile)?.lastName || '' : '',
      specialization: isStudent ? (profile as StudentProfile)?.specialization || '' : '',
      year: isStudent ? (profile as StudentProfile)?.year || 1 : 1,
      interests: isStudent ? (profile as StudentProfile)?.interests || [] : [],
      skills: isStudent ? (profile as StudentProfile)?.skills || [] : [],
    }
  });

  // Supervisor form
  const supervisorForm = useForm<SupervisorFormData>({
    defaultValues: {
      name: !isStudent ? (profile as SupervisorProfile)?.name || '' : '',
      specializations: !isStudent ? (profile as SupervisorProfile)?.specializations || [] : [],
      capacity: !isStudent ? (profile as SupervisorProfile)?.capacity || 5 : 5,
      isAvailable: !isStudent ? (profile as SupervisorProfile)?.isAvailable || true : true,
    }
  });

  const currentForm = isStudent ? studentForm : supervisorForm;

  const onSubmit = async (data: StudentFormData | SupervisorFormData) => {
    try {
      let updateData: UpdateProfileData;

      if (isStudent) {
        const studentData = data as StudentFormData;
        updateData = {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          specialization: studentData.specialization,
          year: studentData.year,
          interests: studentData.interests,
          skills: studentData.skills,
        };
      } else {
        const supervisorData = data as SupervisorFormData;
        updateData = {
          name: supervisorData.name,
          specializations: supervisorData.specializations,
          capacity: Number(supervisorData.capacity),
          isAvailable: supervisorData.isAvailable,
        };
      }

      await updateProfile(updateData);
      onSuccess();
    } catch (error) {
      // Error is handled by the store
    }
  };

  // Helper functions for managing arrays
  const addInterest = () => {
    if (newInterest.trim() && isStudent) {
      const currentInterests = studentForm.getValues('interests');
      if (!currentInterests.includes(newInterest.trim())) {
        studentForm.setValue('interests', [...currentInterests, newInterest.trim()]);
        setNewInterest('');
      }
    }
  };

  const removeInterest = (index: number) => {
    if (isStudent) {
      const currentInterests = studentForm.getValues('interests');
      studentForm.setValue('interests', currentInterests.filter((_, i) => i !== index));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && isStudent) {
      const currentSkills = studentForm.getValues('skills');
      if (!currentSkills.includes(newSkill.trim())) {
        studentForm.setValue('skills', [...currentSkills, newSkill.trim()]);
        setNewSkill('');
      }
    }
  };

  const removeSkill = (index: number) => {
    if (isStudent) {
      const currentSkills = studentForm.getValues('skills');
      studentForm.setValue('skills', currentSkills.filter((_, i) => i !== index));
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !isStudent) {
      const currentSpecs = supervisorForm.getValues('specializations');
      if (!currentSpecs.includes(newSpecialization.trim())) {
        supervisorForm.setValue('specializations', [...currentSpecs, newSpecialization.trim()]);
        setNewSpecialization('');
      }
    }
  };

  const removeSpecialization = (index: number) => {
    if (!isStudent) {
      const currentSpecs = supervisorForm.getValues('specializations');
      supervisorForm.setValue('specializations', currentSpecs.filter((_, i) => i !== index));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-6">
          {profileError && (
            <div className="p-3 border-2 border-black bg-gray-50 text-black text-sm">
              {profileError}
            </div>
          )}

          {isStudent ? (
            // Student Profile Form
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  {...studentForm.register('firstName', { required: 'First name is required' })}
                  error={studentForm.formState.errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  {...studentForm.register('lastName', { required: 'Last name is required' })}
                  error={studentForm.formState.errors.lastName?.message}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Specialization"
                  value={studentForm.watch('specialization')}
                  onValueChange={(value) => studentForm.setValue('specialization', value)}
                  options={SPECIALIZATIONS.map(spec => ({ value: spec, label: spec }))}
                  error={studentForm.formState.errors.specialization?.message}
                />
                <Select
                  label="Year"
                  value={studentForm.watch('year').toString()}
                  onValueChange={(value) => studentForm.setValue('year', parseInt(value))}
                  options={YEARS}
                  error={studentForm.formState.errors.year?.message}
                />
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Interests
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an interest"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    />
                    <Button type="button" onClick={addInterest} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentForm.watch('interests').map((interest, index) => (
                      <div key={index} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-200">
                        <span className="text-sm">{interest}</span>
                        <button
                          type="button"
                          onClick={() => removeInterest(index)}
                          className="text-gray-500 hover:text-black"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Skills
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentForm.watch('skills').map((skill, index) => (
                      <div key={index} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-200">
                        <span className="text-sm">{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="text-gray-500 hover:text-black"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Supervisor Profile Form
            <>
              <Input
                label="Full Name"
                {...supervisorForm.register('name', { required: 'Name is required' })}
                error={supervisorForm.formState.errors.name?.message}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Student Capacity"
                  type="number"
                  min="1"
                  max="20"
                  {...supervisorForm.register('capacity', { 
                    required: 'Capacity is required',
                    min: { value: 1, message: 'Capacity must be at least 1' },
                    max: { value: 20, message: 'Capacity cannot exceed 20' }
                  })}
                  error={supervisorForm.formState.errors.capacity?.message}
                />
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    {...supervisorForm.register('isAvailable')}
                    className="h-4 w-4 border-2 border-black"
                  />
                  <label htmlFor="isAvailable" className="text-sm font-medium text-black">
                    Available for new students
                  </label>
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Specializations
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select
                      placeholder="Select a specialization"
                      value={newSpecialization}
                      onValueChange={setNewSpecialization}
                      options={SPECIALIZATIONS.map(spec => ({ value: spec, label: spec }))}
                    />
                    <Button type="button" onClick={addSpecialization} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supervisorForm.watch('specializations').map((spec, index) => (
                      <div key={index} className="flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-200">
                        <span className="text-sm">{spec}</span>
                        <button
                          type="button"
                          onClick={() => removeSpecialization(index)}
                          className="text-gray-500 hover:text-black"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              loading={isProfileLoading}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onCancel}
              disabled={isProfileLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}