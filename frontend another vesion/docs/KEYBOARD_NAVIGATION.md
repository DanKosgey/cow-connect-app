# Keyboard Navigation Guidelines

This document outlines the keyboard navigation standards implemented in the application to ensure full functionality without a mouse.

## Testing Keyboard Navigation

To test the entire application using only the keyboard:

1. **Tab through all interactive elements**
   - Use the `Tab` key to move forward through focusable elements
   - Use `Shift+Tab` to move backward through focusable elements
   - Ensure all interactive elements receive focus in a logical order

2. **Activate elements**
   - Use `Enter` or `Space` to activate buttons and links
   - Use `Enter` to submit forms
   - Use `Space` to toggle checkboxes and buttons

3. **Navigate custom widgets**
   - Use arrow keys in menus, carousels, and other custom widgets
   - Use `Home` and `End` to jump to the beginning or end of lists when appropriate

4. **Close modals/dialogs**
   - Use `Escape` to close modals, dialogs, and popups

## Tab Order Requirements

### Remove tabindex > 0
Never use positive tabindex values as they create unpredictable tab orders.

### Use tabindex="-1" for programmatic focus
Use `tabindex="-1"` for elements that should receive programmatic focus but not be in the natural tab order.

### Ensure logical tab flow
The tab order should follow a logical sequence that matches the visual layout and user expectations.

## Keyboard Shortcuts

### Common Conventions
- `Ctrl+S` / `Cmd+S` - Save
- `Ctrl+K` / `Cmd+K` - Search/Command palette
- `Escape` - Close modals/dialogs
- `Tab` - Navigate between elements
- `Enter`/`Space` - Activate elements
- `?` - Show help

### Disabling Shortcuts
Keyboard shortcuts can be disabled through the keyboard shortcut settings panel.

## Focus Management

### Focus Trapping for Modals
When a modal or dialog opens:
1. Focus is moved to the first focusable element within the modal
2. Tab navigation is trapped within the modal
3. Pressing `Escape` closes the modal
4. When the modal closes, focus returns to the element that opened it

### Skip Links
Provide skip links at the beginning of the page to allow keyboard users to skip to main content.

## Screen Reader Testing

### Testing Tools
- **macOS**: VoiceOver (Cmd+F5)
- **Windows**: NVDA (free) or JAWS

### Requirements
- All content must be announced properly by screen readers
- Images must have appropriate alt text
- Form elements must have proper labels
- ARIA attributes must be used correctly when needed

## Implementation Details

### Focus Trap Hook
The `useFocusTrap` hook provides focus trapping functionality for modals and dialogs.

### Keyboard Shortcuts Hook
The `useKeyboardShortcuts` hook manages global keyboard shortcuts.

### Keyboard Navigation Context
The `KeyboardNavigationProvider` manages the state of keyboard shortcuts globally.

## Testing Utilities

The `keyboardNavigationTest.ts` utility provides functions for testing keyboard navigation:
- `simulateTab()` - Simulate tab key press
- `simulateShiftTab()` - Simulate shift+tab key press
- `simulateEnter()` - Simulate enter key press
- `simulateSpace()` - Simulate space key press
- `simulateEscape()` - Simulate escape key press
- `getFocusableElements()` - Get all focusable elements in a container
- `isFocusTrapped()` - Check if focus is trapped within a container

## Accessibility Compliance

These keyboard navigation standards help ensure compliance with:
- WCAG 2.1 Level AA
- Section 508
- WAI-ARIA Authoring Practices