# Admin Dashboard Design System Guidelines

This document outlines the design system and styling guidelines for all admin pages based on the redesigned Admin Dashboard.

## Color Palette

### Primary Colors
- Primary: `blue-500` / `#3b82f6`
- Secondary: `indigo-500` / `#6366f1`
- Accent: `purple-500` / `#a855f7`

### Status Colors
- Success: `green-500` / `#10b981`
- Warning: `amber-500` / `#f59e0b`
- Error: `red-500` / `#ef4444`
- Info: `blue-500` / `#3b82f6`

### Background Colors
- Light Background: `gray-50` / `#f9fafb`
- Card Background: `white` / `#ffffff`
- Dark Background: `gray-900` / `#111827`

## Typography

### Font Family
- Primary: System UI fonts (Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)

### Font Sizes
- Display: `text-4xl` / `2.25rem` (Dashboard titles)
- Headings: `text-2xl` / `1.5rem` (Section titles)
- Subheadings: `text-xl` / `1.25rem` (Card titles)
- Body: `text-base` / `1rem` (Main content)
- Captions: `text-sm` / `0.875rem` (Supporting text)

## Spacing System

### Padding
- Card Padding: `p-6` (24px)
- Section Padding: `p-4` (16px)
- Element Padding: `p-3` (12px)

### Margins
- Section Spacing: `mb-8` (32px)
- Card Spacing: `mb-6` (24px)
- Element Spacing: `mb-4` (16px)

## Component Guidelines

### Cards
```tsx
<Card className="border-t-4 border-t-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
  <CardHeader>
    <CardTitle className="flex items-center gap-3">
      <Icon className="h-5 w-5" />
      <span>Card Title</span>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

### Buttons
```tsx
// Primary Button
<Button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800">

// Secondary Button
<Button variant="outline" className="transition-colors duration-300 hover:bg-blue-50">

// Icon Button
<Button variant="ghost" size="icon">
```

### Quick Access Cards
- Use color-coded icons for visual distinction
- Include descriptive titles and explanations
- Add action buttons with clear labels
- Implement hover effects for better interactivity

### Status Indicators
```tsx
<span className={`text-xs px-2 py-1 rounded-full ${
  status === "positive" 
    ? "bg-green-100 text-green-800" 
    : "bg-red-100 text-red-800"
}`}>
  {change}
</span>
```

## Layout Structure

### Page Container
```tsx
<div className="container mx-auto py-6">
  {/* Header */}
  <div className="mb-8">
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Page Title</h1>
    <p className="text-gray-600 mt-2">Page description</p>
  </div>
  
  {/* Content Sections */}
  <div className="mb-8">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Section Title</h2>
        <p className="text-gray-600">Section description</p>
      </div>
      {/* Optional action button */}
    </div>
    
    {/* Section Content */}
  </div>
</div>
```

## Responsive Design

### Breakpoints
- Mobile: `sm` (640px)
- Tablet: `md` (768px)
- Desktop: `lg` (1024px)
- Large Desktop: `xl` (1280px)

### Responsive Patterns
- Stack elements vertically on mobile
- Use grid layouts for cards (1 column on mobile, 2 on tablet, 3 on desktop)
- Hide non-essential text on smaller screens
- Adjust padding and margins for different screen sizes

## Animation and Transitions

### Hover Effects
- Cards: `hover:shadow-xl hover:-translate-y-1`
- Buttons: `hover:scale-[1.02]`
- Navigation items: `transition-all duration-200`

### Loading States
- Use skeleton loaders for content
- Implement smooth transitions between states
- Provide visual feedback for user actions

## Accessibility

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for text
- Use sufficient color differences for status indicators
- Provide alternative text for icons

### Focus States
- Implement visible focus rings for interactive elements
- Use consistent focus styles across components
- Ensure keyboard navigation support

### Semantic HTML
- Use appropriate heading hierarchy
- Implement proper landmark roles
- Provide descriptive labels for form elements

## Common Patterns

### System Status Overview
- Display key metrics in compact cards
- Use color-coded indicators for status changes
- Include percentage changes or trends

### Quick Access Section
- Organize main functions in card grid
- Include descriptive text for each function
- Add direct navigation buttons

### Alerts and Notifications
- Use color-coded backgrounds for different alert types
- Include relevant icons for visual recognition
- Provide clear, actionable messages

### Data Tables
- Use consistent styling for table headers
- Implement proper spacing and padding
- Include hover states for rows
- Add sorting capabilities where appropriate

## Implementation Checklist

When redesigning each admin page, ensure:

1. [ ] Consistent header with page title and description
2. [ ] Proper spacing and padding throughout
3. [ ] Color-coded cards with appropriate accents
4. [ ] Hover effects and transitions for interactive elements
5. [ ] Responsive layout for all screen sizes
6. [ ] Consistent typography hierarchy
7. [ ] Accessible color contrast and focus states
8. [ ] Clear navigation and user feedback
9. [ ] Proper error handling and loading states
10. [ ] Consistent use of the DashboardLayout component