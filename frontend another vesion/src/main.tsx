import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'
import { logger } from './lib/logger';

logger.info('Application starting...');

logger.time('App Render');
createRoot(document.getElementById('root')!).render(
  <App />
);
logger.timeEnd('App Render');
logger.info('Application rendered successfully');

// Add error boundary
window.addEventListener('error', (e) => {
  logger.error('Global error:', e.error);
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  logger.error('Unhandled promise rejection:', e.reason);
  console.error('Unhandled promise rejection:', e.reason);
});