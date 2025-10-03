import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface KeyboardNavigationContextType {
  shortcutsEnabled: boolean;
  toggleShortcuts: () => void;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | undefined>(undefined);

export function KeyboardNavigationProvider({ children }: { children: ReactNode }) {
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  const toggleShortcuts = () => {
    setShortcutsEnabled(!shortcutsEnabled);
  };

  // Define common keyboard shortcuts
  const shortcuts = [
    {
      key: 's',
      ctrlKey: true,
      handler: () => {
        // Save functionality - this would typically be implemented per page
        console.log('Save shortcut triggered');
      }
    },
    {
      key: 'k',
      ctrlKey: true,
      handler: () => {
        // Search functionality
        console.log('Search shortcut triggered');
      }
    },
    {
      key: '?',
      handler: () => {
        // Help functionality
        console.log('Help shortcut triggered');
      }
    }
  ];

  useKeyboardShortcuts(shortcuts, shortcutsEnabled);

  return (
    <KeyboardNavigationContext.Provider value={{ shortcutsEnabled, toggleShortcuts }}>
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

export function useKeyboardNavigation() {
  const context = useContext(KeyboardNavigationContext);
  if (context === undefined) {
    throw new Error('useKeyboardNavigation must be used within a KeyboardNavigationProvider');
  }
  return context;
}