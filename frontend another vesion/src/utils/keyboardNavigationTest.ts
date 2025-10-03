/**
 * Utility functions for testing keyboard navigation
 */

/**
 * Simulate a tab key press to move focus to the next focusable element
 */
export function simulateTab() {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
}

/**
 * Simulate a shift+tab key press to move focus to the previous focusable element
 */
export function simulateShiftTab() {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
}

/**
 * Simulate an enter key press to activate the currently focused element
 */
export function simulateEnter() {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
}

/**
 * Simulate a space key press to activate the currently focused element
 */
export function simulateSpace() {
  const event = new KeyboardEvent('keydown', {
    key: ' ',
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
}

/**
 * Simulate an escape key press to close modals/dialogs
 */
export function simulateEscape() {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
}

/**
 * Get the currently focused element
 */
export function getFocusedElement(): Element | null {
  return document.activeElement;
}

/**
 * Check if an element is focusable
 * @param element - The element to check
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  
  // Check if the element is inherently focusable
  const inherentlyFocusable = [
    'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'AREA', 
    'IFRAME', 'OBJECT', 'EMBED', 'SUMMARY', 'DETAILS'
  ].includes(element.tagName);
  
  // Check if the element has a tabindex
  const hasTabIndex = element.hasAttribute('tabindex');
  
  // Check if the element is disabled
  const isDisabled = element.hasAttribute('disabled');
  
  // Check if the element is hidden
  const isHidden = element.hasAttribute('hidden') || 
                   element.style.display === 'none' || 
                   element.style.visibility === 'hidden';
  
  return !isDisabled && !isHidden && (inherentlyFocusable || hasTabIndex);
}

/**
 * Get all focusable elements in a container
 * @param container - The container to search in
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), details'
  );
  
  return Array.from(focusableElements).filter(isFocusable);
}

/**
 * Check if focus is trapped within a container
 * @param container - The container to check
 */
export function isFocusTrapped(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Focus the first element
  firstElement.focus();
  
  // Simulate shift+tab to try to move to the previous element
  simulateShiftTab();
  
  // Check if focus is still within the container
  const isTrapped = document.activeElement === lastElement;
  
  return isTrapped;
}