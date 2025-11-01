import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";

// Minimal Toaster added during migration (passive until wired to a store)
import Toaster from '@/components/ui/toaster'
// import SonnerToaster from '@/components/ui/sonner' // optional, wire later

// Unregister service workers for debugging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Ensure the root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  // Removed React.StrictMode to prevent double mounting in development
  <>
    <App />
    <Toaster />
    {/* <SonnerToaster /> */}
  </>
);