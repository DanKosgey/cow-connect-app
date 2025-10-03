import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useKeyboardNavigation } from '@/contexts/KeyboardNavigationContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Shortcut {
  key: string;
  description: string;
  modifiers?: string[];
}

const commonShortcuts: Shortcut[] = [
  { key: 'S', description: 'Save', modifiers: ['Ctrl'] },
  { key: 'K', description: 'Search', modifiers: ['Ctrl'] },
  { key: '?', description: 'Show help' },
  { key: 'Escape', description: 'Close modal/dialog' },
  { key: 'Tab', description: 'Navigate between elements' },
  { key: 'Enter', description: 'Activate button/link' },
  { key: 'Space', description: 'Activate button/link' },
  { key: 'Arrow Keys', description: 'Navigate in menus/carousels' },
];

export function KeyboardShortcutHelp() {
  const { shortcutsEnabled, toggleShortcuts } = useKeyboardNavigation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Keyboard Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="shortcuts-toggle">Enable keyboard shortcuts</Label>
            <Switch
              id="shortcuts-toggle"
              checked={shortcutsEnabled}
              onCheckedChange={toggleShortcuts}
            />
          </div>
          
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
            <h3 className="font-medium mb-2">Common Shortcuts</h3>
            <ul className="space-y-2">
              {commonShortcuts.map((shortcut, index) => (
                <li key={index} className="flex justify-between items-center py-1 border-b last:border-b-0">
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.modifiers?.map((modifier, idx) => (
                      <kbd key={idx} className="px-2 py-1 text-xs font-semibold bg-gray-100 border rounded">
                        {modifier}
                      </kbd>
                    ))}
                    <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}