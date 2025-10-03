import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

export function ScreenReaderTest() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Screen Reader Test</h2>
      
      {submitted && (
        <Alert 
          variant="default"
          // Add aria-live for screen readers
          aria-live="polite"
          aria-atomic="true"
        >
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Form submitted successfully. This message is announced by screen readers.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            aria-describedby="name-help"
          />
          <p id="name-help" className="text-sm text-gray-500">
            Please enter your full name as it appears on your ID
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-sm text-gray-500">
            We'll never share your email with anyone else
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="subscribe"
            checked={isSubscribed}
            onCheckedChange={(checked) => setIsSubscribed(checked as boolean)}
            aria-describedby="subscribe-help"
          />
          <Label htmlFor="subscribe">Subscribe to newsletter</Label>
        </div>
        
        <p id="subscribe-help" className="text-sm text-gray-500 ml-6">
          Receive updates about our products and services
        </p>
        
        <Button type="submit" className="w-full">
          Submit Form
        </Button>
      </form>
      
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-2">Interactive Elements</h3>
        <div className="space-y-2">
          <Button variant="outline">Standard Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </Button>
            <span className="text-sm text-gray-500">Icon-only button with aria-label</span>
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-2">Dynamic Content</h3>
        <div 
          aria-live="polite"
          aria-atomic="true"
          className="p-4 bg-gray-100 rounded-md"
        >
          <p>This is a live region that will be announced by screen readers when updated.</p>
          <p className="mt-2 text-sm text-gray-500">
            Current time: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
      
      {/* Visually hidden content for screen readers */}
      <div className="sr-only">
        This content is only visible to screen readers
      </div>
    </div>
  );
}