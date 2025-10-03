import { useEffect, useRef } from 'react';

/**
 * Custom hook for managing focus return
 * Useful for returning focus to the triggering element after closing a modal or dialog
 */
export function useFocusReturn() {
  const triggerRef = useRef<HTMLElement | null>(null);

  /**
   * Save the current active element as the trigger element
   */
  const saveTriggerElement = () => {
    triggerRef.current = document.activeElement as HTMLElement;
  };

  /**
   * Return focus to the saved trigger element
   */
  const returnFocus = () => {
    if (triggerRef.current && document.contains(triggerRef.current)) {
      triggerRef.current.focus();
    }
  };

  return { saveTriggerElement, returnFocus, triggerRef };
}