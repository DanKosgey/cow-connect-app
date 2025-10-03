# Unified Color System

This document explains the standardized color system implemented across all portals in the DairyChain Pro application.

## Color Palette

### Primary Colors
- `primary-50`: #f0fdf4 (Lightest green)
- `primary-100`: #dcfce7 (Light green)
- `primary-500`: #22c55e (Base green - DEFAULT)
- `primary-600`: #16a34a (Dark green)
- `primary-700`: #15803d (Darkest green)

### Secondary Colors
- `secondary-50`: #eff6ff (Light blue)
- `secondary-500`: #3b82f6 (Base blue - DEFAULT)
- `secondary-600`: #2563eb (Dark blue)

### Neutral Colors
- `neutral-50`: #fafafa (Almost white)
- `neutral-100`: #f5f5f5 (Light gray)
- `neutral-500`: #737373 (Medium gray)
- `neutral-900`: #171717 (Almost black)

### Semantic Colors
- `success`: var(--primary-600) - Green for success states
- `error`: #dc2626 - Red for error states
- `warning`: #f59e0b - Amber for warning states
- `info`: var(--secondary-500) - Blue for informational states

## Usage Guidelines

### Text Colors
Replace hardcoded text colors with the new semantic classes:
- `text-green-600` → `text-primary-600`
- `text-blue-500` → `text-secondary-500`
- `text-red-600` → `text-error`
- `text-amber-500` → `text-warning`
- `text-blue-500` → `text-info`

### Background Colors
Replace hardcoded background colors with the new semantic classes:
- `bg-green-500` → `bg-primary-500`
- `bg-blue-500` → `bg-secondary-500`
- `bg-red-500` → `bg-error`
- `bg-amber-500` → `bg-warning`
- `bg-blue-500` → `bg-info`

### Border Colors
Replace hardcoded border colors with the new semantic classes:
- `border-green-500` → `border-primary-500`
- `border-blue-500` → `border-secondary-500`
- `border-red-500` → `border-error`
- `border-amber-500` → `border-warning`
- `border-blue-500` → `border-info`

## Dark Mode Variants

The color system automatically adapts to dark mode through the `.dark` CSS class. All color variables have been defined with appropriate dark mode variants to ensure proper contrast and readability.

## Implementation

The color system is implemented using CSS variables defined in `src/index.css` and made available through Tailwind CSS configuration in `tailwind.config.ts`.

### CSS Variables
```css
:root {
  /* Primary Colors */
  --primary-50: #f0fdf4;
  --primary-100: #dcfce7;
  --primary-500: #22c55e;
  --primary-600: #16a34a;
  --primary-700: #15803d;
  
  /* Secondary Colors */
  --secondary-50: #eff6ff;
  --secondary-500: #3b82f6;
  --secondary-600: #2563eb;
  
  /* Neutral Colors */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-500: #737373;
  --neutral-900: #171717;
  
  /* Semantic Colors */
  --success: var(--primary-600);
  --error: #dc2626;
  --warning: #f59e0b;
  --info: var(--secondary-500);
}
```

### Tailwind Configuration
The colors are available as Tailwind classes:
- `text-primary-500`
- `bg-secondary-600`
- `border-success`
- `text-error`
- etc.

## Migration Guide

When updating existing code, replace the following patterns:

1. **Text Colors**:
   - `text-green-*` → `text-primary-*`
   - `text-blue-*` → `text-secondary-*`

2. **Background Colors**:
   - `bg-green-*` → `bg-primary-*`
   - `bg-blue-*` → `bg-secondary-*`

3. **Border Colors**:
   - `border-green-*` → `border-primary-*`
   - `border-blue-*` → `border-secondary-*`

4. **Semantic States**:
   - Direct color references → semantic color references

## Examples

```jsx
// Before
<div className="text-green-600 bg-blue-100 border-red-500">Content</div>

// After
<div className="text-primary-600 bg-secondary-50 border-error">Content</div>
```

```jsx
// Before
<button className="bg-green-500 hover:bg-green-600 text-white">Submit</button>

// After
<button className="bg-primary-500 hover:bg-primary-600 text-primary-foreground">Submit</button>
```