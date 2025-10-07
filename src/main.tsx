import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";

// Minimal Toaster added during migration (passive until wired to a store)
import Toaster from '@/components/ui/toaster'
// import SonnerToaster from '@/components/ui/sonner' // optional, wire later

createRoot(document.getElementById("root")!).render(
	<>
		<App />
		<Toaster />
		{/* <SonnerToaster /> */}
	</>
);