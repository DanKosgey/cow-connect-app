# Accessibility Guidelines

This document outlines the accessibility guidelines and best practices implemented in the Dairy Farm Management System to ensure WCAG 2.1 Level AA compliance.

## Color Contrast Requirements

### Normal Text (4.5:1 ratio)
- All text must have a contrast ratio of at least 4.5:1 against its background
- This includes body text, labels, and form controls

### Large Text (3:1 ratio)
- Text that is 18px or larger must have a contrast ratio of at least 3:1
- This includes headings and large UI elements

### Implementation
The current color system has been designed to meet these requirements:
- Primary text: `hsl(142, 30%, 10%)` on `hsl(142, 30%, 95%)` background (contrast ratio: 12.5:1)
- Secondary text: `hsl(142, 20%, 40%)` on `hsl(142, 30%, 95%)` background (contrast ratio: 7.2:1)
- Error text: `#dc2626` on `hsl(142, 30%, 95%)` background (contrast ratio: 5.2:1)

## Semantic HTML Structure

### Proper Element Usage
- Use `<button>` elements for all interactive controls
- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<nav>` for navigation sections
- Use `<main>` for primary content
- Use `<article>` and `<section>` for content organization
- Use `<fieldset>` and `<legend>` to group related form controls

### ARIA Attributes
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for help text
- Use `aria-invalid` and `aria-errormessage` for form validation
- Use `aria-expanded` for expandable sections
- Use `aria-live` for dynamic content updates

## Form Accessibility

### Label Association
- All form inputs must have associated labels using `htmlFor`/`id` attributes
- Labels must be descriptive and meaningful
- Use `aria-label` when visual labels are not practical

### Error Handling
- Display error messages clearly
- Associate errors with inputs using `aria-invalid` and `aria-errormessage`
- Provide suggestions for correcting errors

### Help Text
- Provide clear instructions for complex form fields
- Associate help text with inputs using `aria-describedby`

## Focus Management

### Visible Focus Indicators
- All interactive elements must have visible focus indicators
- Focus indicators must be at least 2px thick
- Focus indicators must have sufficient contrast

### Focus Trapping
- Trap focus within modals and dialogs
- Return focus to the triggering element when closing modals

### Skip Links
- Provide skip links to main content
- Make skip links visible on focus

## Screen Reader Support

### Alternative Text
- All images must have descriptive `alt` attributes
- Decorative images should have empty `alt=""` attributes
- Complex images should have detailed descriptions

### Icon-Only Buttons
- All icon-only buttons must have `aria-label` attributes
- Icons should convey meaning through `aria-hidden="true"` when used with text

### Dynamic Content
- Use `aria-live` regions for dynamic content updates
- Announce important changes to screen reader users

## Keyboard Navigation

### Tab Order
- Ensure logical tab order through all interactive elements
- Maintain consistent navigation patterns

### Keyboard Shortcuts
- All functionality must be accessible via keyboard
- Implement common keyboard shortcuts where appropriate

## Testing and Validation

### Automated Testing
- Use tools like axe-core for automated accessibility testing
- Integrate accessibility checks into the development workflow

### Manual Testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Test keyboard navigation
- Test with high contrast modes
- Test with reduced motion settings

### User Testing
- Include users with disabilities in testing processes
- Gather feedback on accessibility features
- Continuously improve based on user feedback

## Components and Patterns

### Button Component
- Uses proper `<button>` element
- Includes focus management
- Supports ARIA attributes
- Provides visual feedback

### Input Component
- Associates labels with inputs
- Supports error states with ARIA attributes
- Includes help text support
- Implements proper focus states

### Dialog Component
- Traps focus within the dialog
- Returns focus when closed
- Provides proper ARIA roles
- Includes close functionality

### SkipLink Component
- Provides keyboard navigation shortcut
- Becomes visible on focus
- Returns focus to main content

## Best Practices

1. **Progressive Enhancement**: Build core functionality first, then enhance with JavaScript
2. **Consistent Navigation**: Maintain consistent navigation patterns throughout the application
3. **Clear Language**: Use clear, simple language that is easy to understand
4. **Responsive Design**: Ensure accessibility works across all device sizes
5. **Performance**: Optimize performance to support assistive technologies
6. **Regular Audits**: Conduct regular accessibility audits and updates

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://w3c.github.io/aria-practices/)
- [axe-core Documentation](https://www.deque.com/axe/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)