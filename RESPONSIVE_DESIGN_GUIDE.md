# Staff Portal Responsive Design Guide

This guide outlines the responsive design principles and implementation strategies used in the staff portal to ensure optimal user experience across all device sizes.

## Design Principles

### 1. Mobile-First Approach
All components are designed with a mobile-first approach, ensuring functionality and usability on small screens before enhancing for larger displays.

### 2. Flexible Grid System
We use CSS Grid and Flexbox for creating flexible layouts that adapt to different screen sizes:
- 1 column on extra small screens (< 480px)
- 2 columns on small screens (480px+)
- 3-4 columns on medium screens (768px+)
- 4-5 columns on large screens (1024px+)

### 3. Scalable Typography
Text sizes adjust based on screen size:
- Extra small screens: 0.75rem - 1rem
- Small screens: 0.875rem - 1.125rem
- Medium screens: 1rem - 1.25rem
- Large screens: 1.125rem - 1.5rem

### 4. Touch-Friendly Interactions
All interactive elements have appropriate sizing for touch interactions:
- Minimum 44px touch targets
- Adequate spacing between interactive elements
- Clear visual feedback on interaction

## Implementation Guidelines

### Grid Layouts
Use the responsive grid classes defined in `src/utils/responsive.ts`:

```tsx
import { responsiveGridClasses } from '@/utils/responsive';

// For summary cards
<div className={responsiveGridClasses.summaryCards}>
  {/* Cards go here */}
</div>

// For chart sections
<div className={responsiveGridClasses.chartSection}>
  {/* Charts go here */}
</div>
```

### Typography
Use responsive text classes:

```tsx
import { responsiveText } from '@/utils/responsive';

<h1 className={responsiveText.heading1}>Main Heading</h1>
<h2 className={responsiveText.heading2}>Section Heading</h2>
<p className={responsiveText.body}>Body text</p>
<span className={responsiveText.small}>Small text</span>
```

### Spacing
Use responsive spacing utilities:

```tsx
import { responsiveSpacing } from '@/utils/responsive';

<div className={responsiveSpacing.sectionPadding}>
  {/* Content with responsive padding */}
</div>
```

### Cards
Use responsive card classes for consistent styling:

```tsx
import { responsiveCards } from '@/utils/responsive';

<Card className={responsiveCards.withHover}>
  {/* Card content */}
</Card>
```

## Component-Specific Guidelines

### Dashboard Components
1. **Summary Cards**: Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for optimal display
2. **Charts**: Set responsive heights (16rem on mobile, 20rem on desktop)
3. **Quick Actions**: Use `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` for button grid

### Data Tables
1. Wrap tables in `overflow-x-auto` containers for horizontal scrolling on small screens
2. Use `text-xs sm:text-sm md:text-base` for table text
3. Ensure table headers are clearly visible and distinguishable

### Forms
1. Use `grid-cols-1 md:grid-cols-2` for form layouts
2. Stack form elements vertically on mobile
3. Ensure form buttons are appropriately sized for touch

### Navigation
1. Use collapsible menus for mobile navigation
2. Ensure navigation items are large enough for touch interaction
3. Provide clear visual hierarchy in navigation

## CSS Utility Classes

The `src/styles/responsive.css` file provides additional utility classes:

### Breakpoints
- `xs`: < 480px
- `sm`: 480px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+

### Responsive Grid Classes
- `responsive-grid-cols-2` to `responsive-grid-cols-5`
- Responsive gap utilities: `responsive-gap-2`, `responsive-gap-4`, `responsive-gap-6`

### Responsive Text
- `responsive-text-sm`, `responsive-text-base`, `responsive-text-lg`

### Responsive Spacing
- `responsive-p-2` to `responsive-p-6` for padding
- `responsive-m-2` to `responsive-m-6` for margin

## Testing Guidelines

### Device Testing
1. Test on actual mobile devices (iOS and Android)
2. Test on tablets in both portrait and landscape modes
3. Test on desktop browsers with responsive developer tools

### Browser Testing
1. Chrome DevTools Device Mode
2. Firefox Responsive Design Mode
3. Safari Responsive Design Mode
4. Edge Developer Tools

### Performance Testing
1. Ensure fast loading times on mobile networks
2. Optimize images for different screen densities
3. Minimize JavaScript bundle size

## Best Practices

### 1. Progressive Enhancement
Start with basic functionality and enhance for larger screens:

```tsx
// Good: Mobile-first approach
<div className="flex flex-col sm:flex-row">
  <div className="w-full sm:w-1/2">Content</div>
  <div className="w-full sm:w-1/2">Sidebar</div>
</div>
```

### 2. Image Optimization
Use responsive images with appropriate sizing:

```tsx
<img 
  src="image.jpg" 
  srcSet="image-320w.jpg 320w, image-480w.jpg 480w, image-800w.jpg 800w"
  sizes="(max-width: 320px) 280px, (max-width: 480px) 440px, 800px"
  alt="Description"
/>
```

### 3. Touch Interactions
Ensure all interactive elements are touch-friendly:

```tsx
<button className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg">
  Touch-friendly button
</button>
```

### 4. Performance Optimization
1. Lazy load images below the fold
2. Code split large components
3. Use efficient animations (transform, opacity)
4. Minimize re-renders with React.memo

## Common Patterns

### 1. Responsive Card Layouts
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</div>
```

### 2. Responsive Tables
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="px-4 py-2 text-left text-xs sm:text-sm">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="px-4 py-2 text-xs sm:text-sm">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 3. Responsive Forms
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label>Field 1</label>
    <input type="text" className="w-full" />
  </div>
  <div>
    <label>Field 2</label>
    <input type="text" className="w-full" />
  </div>
</div>
```

## Future Considerations

1. **Dark Mode Support**: Implement dark mode with CSS variables
2. **Accessibility Enhancements**: Improve screen reader support and keyboard navigation
3. **Progressive Web App**: Add offline support and installability
4. **Performance Monitoring**: Implement real-user monitoring for mobile performance

This guide ensures consistent, high-quality responsive design across all staff portal components.