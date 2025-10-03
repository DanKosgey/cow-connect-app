import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from '@/components/ui/toaster';
import ToastWrapper from '@/components/ToastWrapper';
import ToastDemo from '@/components/ToastDemo';
import { ToastTypesDemo } from '@/components/ToastTypesDemo';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

function App() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <ThemeProvider>
      <ToastWrapper>
        <div className="min-h-screen bg-background">
          <RouterProvider router={router} />
          <Toaster />
          
          {/* Demo components for testing toast notifications */}
          {showDemo && (
            <div className="fixed bottom-4 right-4 space-y-4 max-w-md">
              <ToastDemo />
              <ToastTypesDemo />
              <Button 
                onClick={() => setShowDemo(false)}
                variant="outline"
                className="w-full"
              >
                Hide Demo
              </Button>
            </div>
          )}
          
          {/* Button to show demo components */}
          {!showDemo && (
            <Button 
              onClick={() => setShowDemo(true)}
              className="fixed bottom-4 right-4"
            >
              Show Toast Demo
            </Button>
          )}
        </div>
      </ToastWrapper>
    </ThemeProvider>
  );
}

export default App;