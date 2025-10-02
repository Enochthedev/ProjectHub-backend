'use client';

import React from 'react';
import SupervisorSelection from '@/components/features/supervisor/SupervisorSelection';
import { useAuthStore } from '@/stores/auth';

export default function StudentSupervisorsPage() {
  const { user } = useAuthStore();

  const handleSupervisorRequest = async (supervisorId: string, message: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Sending request to supervisor:', supervisorId, message);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would call the API
      // await api.post('/student/supervisor-requests', {
      //   supervisorId,
      //   message
      // });
      
    } catch (error) {
      console.error('Failed to send supervisor request:', error);
      throw error;
    }
  };

  const handlePreferenceUpdate = async (supervisorId: string, isPreferred: boolean) => {
    try {
      // TODO: Replace with actual API call
      console.log('Updating preference for supervisor:', supervisorId, isPreferred);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In real implementation, this would call the API
      // await api.patch('/student/supervisor-preferences', {
      //   supervisorId,
      //   isPreferred
      // });
      
    } catch (error) {
      console.error('Failed to update supervisor preference:', error);
      throw error;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view supervisors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SupervisorSelection
        studentId={user.id}
        onSupervisorRequest={handleSupervisorRequest}
        onPreferenceUpdate={handlePreferenceUpdate}
      />
    </div>
  );
}