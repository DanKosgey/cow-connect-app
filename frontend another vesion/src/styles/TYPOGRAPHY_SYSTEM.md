# Typography System

This document explains the standardized typography system implemented across all portals in the DairyChain Pro application.

## Font Families

### Heading Font
- **Font Family**: `--font-heading: 'Space Grotesk', sans-serif;`
- **Usage**: All headings (h1, h2, h3, h4)

### Body Font
- **Font Family**: `--font-body: 'Inter', sans-serif;`
- **Usage**: All body text, captions, and overlines

## Font Sizes

| Variable Name | Value | Pixels | Usage |
|---------------|-------|--------|-------|
| `--text-xs` | clamp(0.75rem, 1.5vw, 0.875rem) | 12px-14px | Overlines, small text |
| `--text-sm` | clamp(0.875rem, 2vw, 1rem) | 14px-16px | Captions, secondary text |
| `--text-base` | clamp(1rem, 2.5vw, 1.125rem) | 16px-18px | Body text, default size |
| `--text-lg` | clamp(1.125rem, 3vw, 1.25rem) | 18px-20px | Lead paragraphs |
| `--text-xl` | clamp(1.25rem, 3.5vw, 1.5rem) | 20px-24px | H4 headings |
| `--text-2xl` | clamp(1.5rem, 4vw, 1.875rem) | 24px-30px | H3 headings |
| `--text-3xl` | clamp(1.875rem, 5vw, 2.25rem) | 30px-36px | H2 headings |
| `--text-4xl` | clamp(2.25rem, 6vw, 3rem) | 36px-48px | H1 headings |

## Line Heights

| Variable Name | Value | Usage |
|---------------|-------|-------|
| `--leading-tight` | 1.25 | Compact text, headings |
| `--leading-normal` | 1.5 | Default body text |
| `--leading-relaxed` | 1.75 | Loose text, captions |

## Typography Components

### Heading Component

The Heading component provides consistent styling for all heading levels.

```jsx
import { Heading } from '@/components/typography';

// H1 Heading
<Heading variant="h1">Page Title</Heading>

// H2 Heading
<Heading variant="h2">Section Title</Heading>

// H3 Heading
<Heading variant="h3">Subsection Title</Heading>

// H4 Heading
<Heading variant="h4">Small Section Title</Heading>
```

### Text Component

The Text component provides consistent styling for body text and related elements.

```jsx
import { Text } from '@/components/typography';

// Body Text
<Text variant="body">This is regular body text content.</Text>

// Caption Text
<Text variant="caption">This is smaller caption text.</Text>

// Overline Text
<Text variant="overline">This is overline text.</Text>

// Custom Element
<Text variant="body" as="span">This text is rendered as a span element.</Text>
```

## Responsive Typography

All text sizes use responsive typography with `clamp()` to ensure proper scaling across devices:

| Variable Name | Clamp Value | Min Size | Ideal Size | Max Size |
|---------------|-------------|----------|------------|----------|
| `--text-xs` | clamp(0.75rem, 1.5vw, 0.875rem) | 12px | 1.5vw | 14px |
| `--text-sm` | clamp(0.875rem, 2vw, 1rem) | 14px | 2vw | 16px |
| `--text-base` | clamp(1rem, 2.5vw, 1.125rem) | 16px | 2.5vw | 18px |
| `--text-lg` | clamp(1.125rem, 3vw, 1.25rem) | 18px | 3vw | 20px |
| `--text-xl` | clamp(1.25rem, 3.5vw, 1.5rem) | 20px | 3.5vw | 24px |
| `--text-2xl` | clamp(1.5rem, 4vw, 1.875rem) | 24px | 4vw | 30px |
| `--text-3xl` | clamp(1.875rem, 5vw, 2.25rem) | 30px | 5vw | 36px |
| `--text-4xl` | clamp(2.25rem, 6vw, 3rem) | 36px | 6vw | 48px |

This approach ensures:
- Text remains readable on all device sizes
- Proper scaling from mobile to desktop
- Maintains design consistency across viewports

## Migration Guide

When updating existing code, replace the following patterns:

1. **Heading Elements**:
   ```jsx
   // Before
   <h1 className="text-4xl font-bold">Title</h1>
   
   // After
   <Heading variant="h1">Title</Heading>
   ```

2. **Paragraph Elements**:
   ```jsx
   // Before
   <p className="text-base text-gray-700">Content</p>
   
   // After
   <Text variant="body">Content</Text>
   ```

3. **Caption Text**:
   ```jsx
   // Before
   <span className="text-sm text-gray-500">Caption</span>
   
   // After
   <Text variant="caption">Caption</Text>
   ```

## Examples

```jsx
// Complete example with consistent typography
<div>
  <Heading variant="h1">Welcome to DairyChain Pro</Heading>
  <Text variant="body">
    Manage your dairy operations with our comprehensive platform.
  </Text>
  <Heading variant="h2">Key Features</Heading>
  <Text variant="caption">
    Last updated: {new Date().toLocaleDateString()}
  </Text>
</div>
```