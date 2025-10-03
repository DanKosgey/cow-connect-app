import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Subscribe to new alerts
    const subscription = supabase
      .channel('system_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_activity_log',
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((current) => [...current, newAlert]);
          
          // Show notification for new alerts
          addNotification({
            type: 'info',
            title: 'New Alert',
            message: newAlert.message,
            autoDismiss: true,
          });
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return alerts;
}

export function useRealtimeKYC() {
  const [pendingCount, setPendingCount] = useState(0);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial count
    const fetchInitialCount = async () => {
      const { count } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', 'pending');
      
      setPendingCount(count || 0);
    };

    fetchInitialCount();

    // Subscribe to KYC changes
    const subscription = supabase
      .channel('kyc_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmers',
          filter: 'kyc_status=eq.pending',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPendingCount((current) => current + 1);
            addNotification({
              type: 'warning',
              title: 'New KYC Application',
              message: 'A new farmer KYC application is pending review',
              autoDismiss: true,
            });
          } else if (payload.eventType === 'UPDATE') {
            setPendingCount((current) => current - 1);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return pendingCount;
}

export function useRealtimePayments() {
  const [failedPayments, setFailedPayments] = useState<any[]>([]);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial failed payments
    const fetchFailedPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, farmers(full_name)')
        .eq('status', 'failed')
        .order('created_at', { ascending: false });
      
      setFailedPayments(data || []);
    };

    fetchFailedPayments();

    // Subscribe to payment changes
    const subscription = supabase
      .channel('payment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'failed') {
            const { data: payment } = await supabase
              .from('payments')
              .select('*, farmers(full_name)')
              .eq('id', payload.new.id)
              .single();

            if (payment) {
              setFailedPayments((current) => [payment, ...current]);
              addNotification({
                type: 'error',
                title: 'Payment Failed',
                message: `Payment failed for farmer ${payment.farmers?.full_name}`,
                autoDismiss: true,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return failedPayments;
}