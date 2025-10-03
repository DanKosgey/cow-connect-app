# Toast Notifications Implementation

This document describes the comprehensive toast notification system in the DairyChain Pro application.

## Overview

The toast notification system provides a unified way to display temporary messages to users. It combines two notification systems:

1. **Custom Toast System** - Based on Radix UI primitives
2. **Sonner** - A modern toast notification library

## Core Components

### useToast Hook

The base hook that manages toast state and provides core functionality:

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
```

### useToastNotifications Hook

An enhanced hook that provides a unified API for both toast systems:

```typescript
import useToastNotifications from "@/hooks/useToastNotifications";

const {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  updateToast,
  dismissToast,
  promiseToast
} = useToastNotifications();
```

## Usage Examples

### Basic Toast Notifications

```typescript
import useToastNotifications from "@/hooks/useToastNotifications";

const MyComponent = () => {
  const toast = useToastNotifications();

  const handleSuccess = () => {
    toast.showSuccess("Operation Successful", "Your data has been saved");
  };

  const handleError = () => {
    toast.showError("Operation Failed", "Please try again later");
  };

  const handleWarning = () => {
    toast.showWarning("Warning", "This action cannot be undone");
  };

  const handleInfo = () => {
    toast.showInfo("Information", "New features are available");
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
};
```

### Loading Toast Notifications

```typescript
const handleAsyncOperation = async () => {
  const toastId = toast.showLoading("Processing", "Please wait...");
  
  try {
    await someAsyncOperation();
    toast.updateToast(toastId, "Success", "Operation completed", "success");
  } catch (error) {
    toast.updateToast(toastId, "Error", "Operation failed", "error");
  }
};
```

### Promise-Based Toast Notifications

```typescript
const handlePromiseOperation = async () => {
  toast.promiseToast(
    someAsyncOperation(),
    {
      loading: "Processing...",
      success: "Operation completed successfully",
      error: "Operation failed"
    },
    {
      duration: 5000
    }
  );
};
```

### Toast with Actions

```typescript
const handleUndoableAction = () => {
  toast.showInfo("Action Performed", "You can undo this action", {
    action: {
      label: "Undo",
      onClick: () => {
        // Undo the action
        console.log("Action undone");
      }
    },
    duration: 10000
  });
};
```

## Toast Types

### Success Toast

Green-themed toast for successful operations:

```typescript
toast.showSuccess("Success", "Operation completed successfully");
```

### Error Toast

Red-themed toast for errors and failures:

```typescript
toast.showError("Error", "Something went wrong");
```

### Warning Toast

Yellow-themed toast for warnings and cautions:

```typescript
toast.showWarning("Warning", "Please check your input");
```

### Info Toast

Blue-themed toast for informational messages:

```typescript
toast.showInfo("Information", "New update available");
```

### Loading Toast

Special toast with loading spinner:

```typescript
toast.showLoading("Loading", "Please wait...");
```

## Customization Options

### Duration

Control how long a toast is displayed:

```typescript
toast.showInfo("Message", "This will disappear in 3 seconds", {
  duration: 3000
});
```

### Actions

Add interactive buttons to toasts:

```typescript
toast.showInfo("Confirm Action", "Are you sure?", {
  action: {
    label: "Confirm",
    onClick: () => console.log("Confirmed")
  }
});
```

### Dismiss Callback

Execute code when a toast is dismissed:

```typescript
toast.showInfo("Message", "Description", {
  onDismiss: () => console.log("Toast dismissed")
});
```

## Accessibility

The toast system follows accessibility best practices:

- Proper ARIA attributes for screen readers
- Focus management
- Keyboard navigation support
- Color contrast compliance
- Semantic HTML structure

## Best Practices

1. **Keep Messages Concise** - Toasts should be brief and to the point
2. **Use Appropriate Types** - Match the toast type to the message content
3. **Provide Actionable Information** - Include clear calls to action when relevant
4. **Consider Timing** - Set appropriate durations based on message importance
5. **Avoid Overuse** - Don't overwhelm users with too many notifications
6. **Test Accessibility** - Ensure notifications work with screen readers

## Testing

The toast system has been tested with:

- Different toast types (success, error, warning, info)
- Custom durations
- Action buttons
- Promise-based notifications
- Loading states
- Dismissal functionality
- Accessibility compliance

## Future Improvements

1. **Custom Themes** - Support for different color schemes
2. **Position Control** - Allow users to choose toast position
3. **Rich Content** - Support for images and custom components in toasts
4. **Internationalization** - Multi-language support
5. **Persistence** - Option to persist important notifications
6. **Grouping** - Group similar notifications together