# Toast Notification Accessibility Guide

This guide outlines the accessibility features and best practices for implementing toast notifications in the DairyChain Pro application.

## Accessibility Features Implemented

### 1. Screen Reader Support

Toast notifications are designed with screen reader accessibility in mind:

- **ARIA Live Regions**: Toast notifications use appropriate `aria-live` attributes:
  - Success/Info/Warning toasts: `aria-live="polite"` (announces when the screen reader is idle)
  - Error toasts: `aria-live="assertive"` (interrupts screen reader immediately)
  
- **ARIA Atomic Updates**: `aria-atomic="true"` ensures the entire toast content is announced as a single unit

- **Semantic Roles**: Toast notifications use `role="alert"` for error messages and `role="status"` for informational messages

### 2. Focus Management

- Toast notifications do not interrupt keyboard focus flow
- Close buttons are properly labeled with "Close" text for screen readers
- Toast containers are not focusable by default

### 3. Visual Accessibility

- **Color Contrast**: All toast types maintain WCAG AA contrast ratios (4.5:1 for normal text)
- **Visual Indicators**: Color is not the only indicator of status; icons and text provide redundant information
- **Text Size**: Toast text uses readable font sizes (14px minimum)

### 4. Keyboard Navigation

- Toast notifications can be dismissed using keyboard shortcuts
- Close buttons are focusable and can be activated with Enter/Space keys
- Toast actions are keyboard accessible

## Best Practices for Using Toast Notifications

### 1. Appropriate Use Cases

- **Success**: Confirm successful completion of user actions
- **Error**: Notify users of problems that require attention
- **Warning**: Alert users to potentially harmful situations
- **Info**: Provide neutral information that doesn't require action

### 2. Content Guidelines

- Keep messages concise and actionable
- Use clear, simple language
- Include specific error details when relevant
- Provide actionable next steps when possible

### 3. Timing and Duration

- Error toasts should persist until dismissed
- Success/Info toasts should auto-dismiss after 5-10 seconds
- Warning toasts should persist longer than success/info but allow dismissal

### 4. Placement

- Toasts appear in the top-right corner of the viewport
- Multiple toasts stack vertically
- Toasts do not obscure important UI elements

## Implementation Details

### Custom Toast Hook

The `useToastNotifications` hook provides accessible toast functionality:

```typescript
const toast = useToastContext();

// Success toast
toast.showSuccess('Success!', 'Your action was completed successfully.');

// Error toast
toast.showError('Error!', 'Something went wrong. Please try again.');

// Warning toast
toast.showWarning('Warning!', 'This is a warning message.');

// Info toast
toast.showInfo('Information', 'This is an informational message.');
```

### Promise-based Toasts

For async operations, use promise-based toasts:

```typescript
toast.promiseToast(
  apiCall(),
  {
    loading: 'Processing...',
    success: 'Operation completed successfully!',
    error: 'Operation failed. Please try again.'
  }
);
```

## Testing Accessibility

### Screen Reader Testing

Test with popular screen readers:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

### Keyboard Navigation Testing

Ensure all toast interactions work with keyboard:
- Tab to focus close button
- Enter/Space to activate
- Escape to dismiss (if implemented)

### Color Contrast Testing

Verify all toast variations meet WCAG AA standards:
- Text against background
- Icons against background
- Border colors

## WCAG Compliance

This implementation meets the following WCAG 2.1 success criteria:

- **1.3.1 Info and Relationships** (Level A)
- **1.4.1 Use of Color** (Level A)
- **1.4.12 Text Spacing** (Level AA)
- **2.1.1 Keyboard** (Level A)
- **2.1.3 Keyboard (No Exception)** (Level AAA)
- **4.1.2 Name, Role, Value** (Level A)

## Future Improvements

Planned accessibility enhancements:
- Add option for persistent toasts for users who need more time
- Implement toast history for users who miss notifications
- Add high contrast mode for visually impaired users
- Provide audio cues for critical notifications