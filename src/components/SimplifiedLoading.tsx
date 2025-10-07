import React from 'react';

export const SimplifiedLoading = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
};