'use client';

import React from 'react';
import StudentRequestManagement from '@/components/features/supervisor/StudentRequestManagement';
import { useAuthStore } from '@/stores/auth';

export default function SupervisorRequestsPage() {
  const { user } = useAuthStore();

  const handleAcceptRequest = async (requestId: string, message?: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Accepting request:', requestId, message);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would call the API
      // await api.post(`/supervisor/requests/${requestId}/accept`, {
      //   message
      // });
      
    } catch (error) {
      console.error('Failed to accept request:', error);
      throw error;
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Rejecting request:', requestId, reason);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would call the API
      // await api.post(`/supervisor/requests/${requestId}/reject`, {
      //   reason
      // });
      
    } catch (error) {
      console.error('Failed to reject request:', error);
      throw error;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <StudentRequestManagement
        supervisorId={user.id}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
      />
    </div>
  );
}