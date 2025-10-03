# Screen Reader Testing Guide

This document provides guidance on testing the application with screen readers to ensure accessibility compliance.

## Screen Reader Testing Tools

### macOS
- **VoiceOver**: Built-in screen reader (Cmd+F5 to toggle)

### Windows
- **NVDA**: Free, open-source screen reader
- **JAWS**: Commercial screen reader

## Testing Requirements

### Content Announcement
- All content must be announced properly by screen readers
- Images must have appropriate alt text
- Form elements must have proper labels
- ARIA attributes must be used correctly when needed

### Navigation
- Users should be able to navigate through all content using screen readers
- Headings should be properly structured (h1 → h2 → h3)
- Links should have descriptive text
- Buttons should have clear labels

### Dynamic Content
- Changes to dynamic content should be announced
- Use `aria-live` regions for important updates
- Error messages should be announced immediately

## Testing Procedures

### 1. Basic Navigation
1. Turn on the screen reader
2. Navigate through the page using keyboard shortcuts
3. Verify that all content is announced correctly
4. Check that headings are announced with their level
5. Ensure links and buttons are announced with their purpose

### 2. Form Testing
1. Navigate to each form field
2. Verify that labels are announced
3. Check that help text is announced
4. Submit the form with errors and verify error messages are announced
5. Ensure that focus moves to error fields when appropriate

### 3. Interactive Elements
1. Test all buttons and links
2. Verify that icon-only buttons have appropriate `aria-label`
3. Check that expanded/collapsed states are announced
4. Test modal dialogs and focus management

### 4. Dynamic Content
1. Trigger dynamic content updates
2. Verify that changes are announced
3. Check that `aria-live` regions work correctly
4. Ensure that status messages are announced

## Common Screen Reader Commands

### VoiceOver (macOS)
- `Ctrl+Option+Right Arrow`: Move to next item
- `Ctrl+Option+Left Arrow`: Move to previous item
- `Ctrl+Option+Shift+Down Arrow`: Read details of current item
- `Ctrl+Option+U`: Show rotor (navigation menu)
- `Cmd+F5`: Toggle VoiceOver

### NVDA (Windows)
- `Down Arrow`: Move to next item
- `Up Arrow`: Move to previous item
- `Insert+Down Arrow`: Read current line
- `Insert+Tab`: Read focusable item
- `Insert+Space`: Toggle NVDA

### JAWS (Windows)
- `Down Arrow`: Move to next item
- `Up Arrow`: Move to previous item
- `Ctrl+Ins+Down Arrow`: Read current line
- `Tab`: Move to next focusable item
- `Insert+J`: Toggle JAWS

## Best Practices

### 1. Semantic HTML
- Use proper heading hierarchy
- Use native HTML elements when possible
- Ensure proper landmark structure

### 2. ARIA Attributes
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for help text
- Use `aria-live` for dynamic content
- Use `aria-expanded` for collapsible sections

### 3. Focus Management
- Ensure logical focus order
- Trap focus in modals
- Return focus after closing modals
- Provide skip links

### 4. Content Structure
- Use descriptive link text
- Provide meaningful page titles
- Structure content with headings
- Use lists for grouped items

## Testing Checklist

### Before Testing
- [ ] Screen reader is installed and working
- [ ] Keyboard navigation is fully functional
- [ ] All ARIA attributes are properly implemented

### During Testing
- [ ] All content is announced correctly
- [ ] Form labels and instructions are clear
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced
- [ ] Focus management works correctly
- [ ] Navigation is logical and intuitive

### After Testing
- [ ] Document any issues found
- [ ] Verify fixes for identified issues
- [ ] Retest with multiple screen readers
- [ ] Update accessibility documentation

## Common Issues to Look For

### 1. Missing or Inappropriate Labels
- Missing alt text on images
- Unlabeled form fields
- Icon-only buttons without aria-label

### 2. Poor Focus Management
- Focus not trapped in modals
- Focus not returned after closing modals
- Illogical tab order

### 3. Dynamic Content Issues
- Changes not announced
- aria-live regions not working
- Status messages not announced

### 4. Navigation Problems
- Inaccessible dropdown menus
- Poorly structured headings
- Missing landmark regions

## Resources

### Documentation
- [WAI-ARIA Authoring Practices](https://w3c.github.io/aria-practices/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)