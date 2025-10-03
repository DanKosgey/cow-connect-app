import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
}

/**
 * Custom hook for managing keyboard shortcuts
 * 
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param isActive - Whether the shortcuts are active
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        // Check if all required modifier keys match
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        
        // Check if the key matches
        const keyMatch = event.key === shortcut.key;
        
        // If all conditions match, call the handler
        if (ctrlMatch && metaMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, isActive]);
}