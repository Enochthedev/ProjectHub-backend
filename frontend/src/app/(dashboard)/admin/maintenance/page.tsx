'use client';

import React from 'react';
import { MaintenanceMode } from '@/components/features/admin';

export default function AdminMaintenancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <MaintenanceMode />
    </div>
  );
}