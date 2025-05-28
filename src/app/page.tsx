'use client';

import React from 'react';
import OverlordSidebar from '@/components/navigation/OverlordSidebar';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-900">
      <OverlordSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-white">Welcome to the Dashboard</h1>
        <p className="mt-4 text-gray-300">Select an option from the sidebar to get started.</p>
      </main>
    </div>
  );
}
