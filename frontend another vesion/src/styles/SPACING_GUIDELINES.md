# Spacing Guidelines

This document explains the standardized spacing system implemented across all portals in the DairyChain Pro application.

## Spacing Scale

The spacing system uses a consistent scale defined in `tailwind.config.ts`:

| Scale Name | Value  | Pixels | Usage                  |
|------------|--------|--------|------------------------|
| `xs`       | 0.25rem| 4px    | Minimal spacing        |
| `sm`       | 0.5rem | 8px    | Small spacing          |
| `md`       | 1rem   | 16px   | Default spacing        |
| `lg`       | 1.5rem | 24px   | Large spacing          |
| `xl`       | 2rem   | 32px   | Extra large spacing    |
| `2xl`      | 3rem   | 48px   | Double extra large     |
| `3xl`      | 4rem   | 64px   | Triple extra large     |

## Usage Guidelines

### Padding
Use padding utilities for inner spacing within elements:
- `p-xs` - Minimal padding for tight elements
- `p-sm` - Small padding for compact components
- `p-md` - Default padding for cards and containers
- `p-lg` - Large padding for spacious sections
- `p-xl` - Extra large padding for hero sections

### Margin
Use margin utilities for outer spacing between elements:
- `m-xs` - Minimal margin for tight layouts
- `m-sm` - Small margin for compact spacing
- `m-md` - Default margin for standard spacing
- `m-lg` - Large margin for significant separation
- `m-xl` - Extra large margin for major sections

### Directional Spacing
Use directional variants for specific sides:
- `pt-`, `pr-`, `pb-`, `pl-` for top, right, bottom, left padding
- `mt-`, `mr-`, `mb-`, `ml-` for top, right, bottom, left margin
- `px-`, `py-` for horizontal and vertical padding
- `mx-`, `my-` for horizontal and vertical margin

### Gap Utilities
Use gap utilities for flexbox and grid layouts:
- `gap-xs` - Minimal gap between items
- `gap-sm` - Small gap between items
- `gap-md` - Default gap between items
- `gap-lg` - Large gap between items
- `gap-xl` - Extra large gap between items

## Common Patterns

### Form Elements
```jsx
// Before
<div className="space-y-4">
  <div className="mb-3">
    <label className="block mb-1">Label</label>
    <input className="w-full p-2" />
  </div>
</div>

// After
<div className="space-y-md">
  <div className="mb-sm">
    <label className="block mb-xs">Label</label>
    <input className="w-full p-sm" />
  </div>
</div>
```

### Card Layouts
```jsx
// Before
<Card className="p-6 mb-4">
  <CardHeader className="pb-3">
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content
  </CardContent>
</Card>

// After
<Card className="p-lg mb-md">
  <CardHeader className="pb-sm">
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content
  </CardContent>
</Card>
```

### Button Spacing
```jsx
// Before
<Button className="px-4 py-2 mr-2">
  Primary Action
</Button>
<Button variant="outline" className="px-4 py-2">
  Secondary Action
</Button>

// After
<Button className="px-lg py-sm mr-sm">
  Primary Action
</Button>
<Button variant="outline" className="px-lg py-sm">
  Secondary Action
</Button>
```

### Grid and Flex Layouts
```jsx
// Before
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// After
<div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Migration Guide

When updating existing code, replace the following patterns:

1. **Arbitrary Values**:
   ```jsx
   // Before
   <div className="p-4 m-2 gap-6">
   
   // After
   <div className="p-md m-sm gap-lg">
   ```

2. **Pixel-Based Values**:
   ```jsx
   // Before
   <div className="pt-2 pr-4 pb-6 pl-8">
   
   // After
   <div className="pt-sm pr-md pb-lg pl-xl">
   ```

3. **Rem-Based Values**:
   ```jsx
   // Before
   <div className="m-1 p-0.5 gap-1.5">
   
   // After
   <div className="m-sm p-xs gap-sm">
   ```

## Responsive Spacing

The spacing system works seamlessly with responsive utilities:

```jsx
// Different spacing on mobile vs desktop
<div className="p-sm md:p-md lg:p-lg">
  Responsive padding
</div>

// Responsive gap in grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 gap-sm md:gap-md lg:gap-lg">
  Grid items
</div>
```

## Best Practices

1. **Consistency**: Always use the defined spacing scale rather than arbitrary values
2. **Hierarchy**: Use larger spacing to separate major sections and smaller spacing for related elements
3. **Responsive Design**: Consider how spacing works across different screen sizes
4. **Visual Rhythm**: Maintain consistent spacing patterns throughout the application
5. **Accessibility**: Ensure adequate spacing for touch targets and readability

## Examples

```jsx
// Complete example with consistent spacing
<div className="p-lg space-y-xl">
  <Heading variant="h1">Page Title</Heading>
  <Text variant="body">
    Page description with consistent spacing.
  </Text>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
    <Card className="p-md">
      <CardTitle>Card 1</CardTitle>
      <CardContent>
        Card content with proper spacing.
      </CardContent>
    </Card>
    
    <Card className="p-md">
      <CardTitle>Card 2</CardTitle>
      <CardContent>
        Card content with proper spacing.
      </CardContent>
    </Card>
    
    <Card className="p-md">
      <CardTitle>Card 3</CardTitle>
      <CardContent>
        Card content with proper spacing.
      </CardContent>
    </Card>
  </div>
  
  <div className="flex space-x-md">
    <Button>Primary Action</Button>
    <Button variant="outline">Secondary Action</Button>
  </div>
</div>
```