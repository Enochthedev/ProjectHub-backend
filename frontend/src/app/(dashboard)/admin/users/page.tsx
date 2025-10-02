'use client';

import React from 'react';
import { UserManagement } from '@/components/features/admin';

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserManagement />
    </div>
  );
}