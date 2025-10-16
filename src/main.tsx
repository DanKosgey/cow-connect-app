import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";

// Minimal Toaster added during migration (passive until wired to a store)
import Toaster from '@/components/ui/toaster'
// import SonnerToaster from '@/components/ui/sonner' // optional, wire later

// Ensure the root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
	<React.StrictMode>
		<App />
		<Toaster />
		{/* <SonnerToaster /> */}
	</React.StrictMode>
);