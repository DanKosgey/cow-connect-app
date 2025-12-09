import React from 'react';
import AdminDashboard from '@/pages/admin/AdminDashboard';

const TestAdminDashboard = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard Test</h1>
      <div className="border rounded-lg p-4">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default TestAdminDashboard;