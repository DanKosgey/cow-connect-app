import { useState, useEffect } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const toast = useToastNotifications();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/service-worker.js');
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                toast.success('Update Available', 'A new version is available. Refresh to update.');
              }
            });
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      registerSW();
    }
  }, [toast]);

  const update = async () => {
    if (!registration) return;

    try {
      await registration.update();
      window.location.reload();
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
      toast.error('Update Failed', 'Please try again later.');
    }
  };

  return {
    registration,
    updateAvailable,
    update,
    supported: 'serviceWorker' in navigator,
  };
}