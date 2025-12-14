// Ensure React is available globally before any other imports
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";
import { initRecurringDeductions } from '@/utils/init-recurring-deductions';

// Minimal Toaster added during migration (passive until wired to a store)
import Toaster from '@/components/ui/toaster'
// import SonnerToaster from '@/components/ui/sonner' // optional, wire later

// Initialize recurring deductions
initRecurringDeductions();

// Unregister service workers for debugging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  
  // Also clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

// Ensure the root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// Make sure React is fully loaded before rendering
setTimeout(() => {
  createRoot(rootElement).render(
    // Removed React.StrictMode to prevent double mounting in development
    <>
      <App />
      <Toaster />
      {/* <SonnerToaster /> */}
    </>
  );
}, 0);