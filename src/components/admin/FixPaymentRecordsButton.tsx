import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fixCollectorPaymentRecords, regenerateAllPaymentRecords } from '@/utils/fix-payment-records';
import useToastNotifications from '@/hooks/useToastNotifications';

interface FixPaymentRecordsButtonProps {
  onRefresh?: () => void;
}

export const FixPaymentRecordsButton: React.FC<FixPaymentRecordsButtonProps> = ({ onRefresh }) => {
  const { success, error } = useToastNotifications();
  const [loading, setLoading] = useState(false);

  const handleFixPaymentRecords = async () => {
    if (!window.confirm('This will attempt to fix payment records for all collectors. Are you sure?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await fixCollectorPaymentRecords();
      
      if (result) {
        success('Success', 'Payment records fixed successfully');
        if (onRefresh) onRefresh();
      } else {
        error('Error', 'Failed to fix payment records');
      }
    } catch (err) {
      console.error('Error fixing payment records:', err);
      error('Error', 'An error occurred while fixing payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAllRecords = async () => {
    if (!window.confirm('This will delete ALL existing payment records and regenerate them. This cannot be undone. Are you sure?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await regenerateAllPaymentRecords();
      
      if (result) {
        success('Success', 'All payment records regenerated successfully');
        if (onRefresh) onRefresh();
      } else {
        error('Error', 'Failed to regenerate payment records');
      }
    } catch (err) {
      console.error('Error regenerating payment records:', err);
      error('Error', 'An error occurred while regenerating payment records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button 
        onClick={handleFixPaymentRecords}
        disabled={loading}
        variant="outline"
        className="bg-yellow-500 hover:bg-yellow-600 text-white"
      >
        {loading ? 'Fixing...' : 'Fix Payment Records'}
      </Button>
      <Button 
        onClick={handleRegenerateAllRecords}
        disabled={loading}
        variant="outline"
        className="bg-red-500 hover:bg-red-600 text-white"
      >
        {loading ? 'Regenerating...' : 'Regenerate All Records'}
      </Button>
    </div>
  );
};

export default FixPaymentRecordsButton;