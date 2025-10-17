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
  const [payments, setPayments] = useState<any[]>([]);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial payments
    const fetchPayments = async () => {
      const { data } = await supabase
        .from('farmer_payments')
        .select(`
          *,
          farmers!farmer_payments_farmer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      
      setPayments(data || []);
    };

    fetchPayments();

    // Subscribe to payment changes
    const subscription = supabase
      .channel('payment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmer_payments',
        },
        async (payload) => {
          // Handle all payment changes
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: payment } = await supabase
              .from('farmer_payments')
              .select(`
                *,
                farmers!farmer_payments_farmer_id_fkey(full_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (payment) {
              setPayments((current) => {
                // Remove existing payment if it exists
                const filtered = current.filter(p => p.id !== payment.id);
                // Add the updated payment to the beginning
                return [payment, ...filtered];
              });
              
              // Send notification for status changes
              if (payload.eventType === 'UPDATE' && payload.old.approval_status !== payload.new.approval_status) {
                addNotification({
                  type: 'info',
                  title: 'Payment Status Updated',
                  message: `Payment status changed to ${payment.approval_status} for farmer ${payment.farmers?.full_name}`,
                  autoDismiss: true,
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setPayments((current) => current.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return payments;
}
