# Image Optimization Guide

This guide outlines the best practices for image optimization in the Dairy Farm Management System to ensure optimal performance across all devices and network conditions.

## Responsive Images Implementation

### 1. Responsive Image Component
We've implemented a [ResponsiveImage](../components/ui/ResponsiveImage.tsx) component that:
- Uses `srcset` for multiple resolutions (1x, 2x, 3x)
- Implements native lazy loading by default
- Provides responsive sizing with CSS classes

### 2. Picture Element for Art Direction
We've implemented a [PictureImage](../components/ui/PictureImage.tsx) component that:
- Uses the `<picture>` element for art direction
- Supports WebP format with JPEG fallback
- Implements native lazy loading by default

## Background Image Optimization

### CSS Media Queries
We've implemented responsive background images using CSS media queries in [mobile.css](../styles/mobile.css):

```css
/* Mobile */
@media (max-width: 768px) {
  .hero-bg-mobile {
    background-image: url('/assets/dairy-farm-bg-768.jpg');
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .hero-bg-tablet {
    background-image: url('/assets/dairy-farm-bg-1200.jpg');
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .hero-bg-desktop {
    background-image: url('/assets/dairy-farm-bg-1920.jpg');
  }
}

/* High resolution displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .hero-bg-retina {
    background-image: url('/assets/dairy-farm-bg-2x.jpg');
  }
}
```

## Image Format Optimization

### WebP Format
All images should be provided in WebP format with JPEG fallback for better compression:

```jsx
<PictureImage
  src="/assets/dairy-farm-bg.jpg"
  alt="Dairy farm background"
  sources={[
    {
      srcSet: "/assets/dairy-farm-bg.webp",
      type: "image/webp"
    },
    {
      srcSet: "/assets/dairy-farm-bg.jpg",
      type: "image/jpeg"
    }
  ]}
/>
```

### File Size Targets
- Aim for <100KB per image
- Use appropriate compression levels
- Consider progressive JPEG for large images

## Lazy Loading Implementation

### Native Lazy Loading
All non-critical images implement native lazy loading:

```html
<img src="image.jpg" alt="Description" loading="lazy" />
```

### When to Use Lazy Loading
- All background images except critical above-the-fold content
- All user-generated content images
- All decorative images
- Evidence photos in task management
- Collection photos in forms

## Image Compression Workflow

### Required Image Sizes
For the dairy farm background image, create these versions:
- `dairy-farm-bg-768.jpg` - 768px wide for mobile
- `dairy-farm-bg-1200.jpg` - 1200px wide for tablet
- `dairy-farm-bg-1920.jpg` - 1920px wide for desktop
- `dairy-farm-bg-2x.jpg` - 2x resolution for high-DPI displays

### WebP Conversion
Convert all JPEG images to WebP format for better compression:
- Use 80% quality for photographs
- Use 60% quality for graphics with fewer colors

### Tools for Image Optimization
Recommended tools for image optimization:
1. ImageMagick CLI: `magick input.jpg -quality 80 -define webp:method=6 output.webp`
2. Squoosh CLI: `npx @squoosh/cli --webp '{"quality":80}' input.jpg`
3. Sharp CLI: `npx sharp -i input.jpg -o output.webp --webp`

## Performance Testing

### 3G Connection Testing
Test all image loading on slow 3G connections:
- Use browser dev tools to simulate 3G network
- Verify lazy loading works correctly
- Ensure critical images load within acceptable time

### Performance Metrics
Monitor these metrics:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

## Implementation Checklist

- [x] Create responsive image components
- [x] Implement picture element for art direction
- [x] Add lazy loading to all non-critical images
- [ ] Compress images to <100KB
- [ ] Convert images to WebP format with JPEG fallback
- [ ] Create multiple resolutions for responsive images
- [ ] Test on slow 3G connections
- [ ] Document image optimization workflow

## Best Practices

1. **Always use descriptive alt text** for accessibility
2. **Specify image dimensions** to prevent layout shift
3. **Use appropriate image formats** (WebP for photos, SVG for graphics)
4. **Implement proper caching headers** on the server
5. **Consider using a CDN** for image delivery
6. **Monitor performance metrics** regularly