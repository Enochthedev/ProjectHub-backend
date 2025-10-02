'use client';

import React from 'react';
import { SystemHealth } from '@/components/features/admin';

export default function AdminSystemPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SystemHealth />
    </div>
  );
}