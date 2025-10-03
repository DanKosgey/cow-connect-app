# Image Testing Guide

This guide explains how to test image optimization and performance on slow network connections.

## Testing on Slow 3G Connections

### Browser DevTools Network Throttling

1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Select "Slow 3G" or "Fast 3G" from the throttling dropdown
4. Reload the page and observe:
   - Image loading order
   - Lazy loading behavior
   - Time to load critical images
   - Overall page performance

### Key Metrics to Monitor

1. **First Contentful Paint (FCP)**: Time until first image/content is painted
2. **Largest Contentful Paint (LCP)**: Time until largest image is painted
3. **Cumulative Layout Shift (CLS)**: Image loading should not cause layout shifts
4. **Total Blocking Time (TBT)**: Time spent processing image loading

### Testing Checklist

- [ ] Verify lazy loading works correctly (non-critical images load after critical content)
- [ ] Confirm WebP images load when supported by the browser
- [ ] Check that fallback images load when WebP is not supported
- [ ] Ensure responsive images load appropriate size for viewport
- [ ] Validate that background images load correctly at different breakpoints
- [ ] Test image loading on different devices and orientations
- [ ] Confirm no 404 errors for image assets
- [ ] Verify alt text is displayed when images fail to load

### Manual Testing Steps

1. **Mobile Viewport Testing**:
   - Resize browser to 320px width
   - Verify mobile background images load
   - Check that touch targets are appropriate size

2. **Tablet Viewport Testing**:
   - Resize browser to 768px width
   - Verify tablet background images load
   - Check image quality and loading times

3. **Desktop Viewport Testing**:
   - Resize browser to 1920px width
   - Verify desktop background images load
   - Check that high-resolution images are used appropriately

4. **Offline Testing**:
   - Disable network connection
   - Verify that cached images still display
   - Check that fallback content is appropriate

### Performance Optimization Verification

1. **Image Sizes**:
   - Mobile images: <50KB
   - Tablet images: <100KB
   - Desktop images: <200KB

2. **Loading Behavior**:
   - Critical images (above the fold): Load immediately
   - Non-critical images: Load after page is interactive
   - Background images: Load with appropriate priority

3. **Format Support**:
   - Modern browsers: Load WebP images
   - Legacy browsers: Load JPEG fallbacks
   - All browsers: Display appropriate content

### Troubleshooting Common Issues

1. **Images not loading**:
   - Check file paths in network tab
   - Verify file permissions
   - Confirm file formats are supported

2. **Wrong image sizes loading**:
   - Check srcset implementation
   - Verify media queries in CSS
   - Confirm viewport sizes in dev tools

3. **Layout shifts**:
   - Ensure explicit dimensions on images
   - Use aspect ratio containers
   - Implement proper loading states

4. **Slow loading times**:
   - Optimize image compression
   - Implement proper caching headers
   - Consider using a CDN for image delivery

### Automated Testing

For continuous testing, consider implementing:

1. **Lighthouse CI**:
   ```bash
   # Run Lighthouse audits on image performance
   npx lighthouse-ci
   ```

2. **WebPageTest**:
   - Use webpagetest.org for detailed performance analysis
   - Test on real devices with 3G connections

3. **Performance Monitoring**:
   - Implement Core Web Vitals tracking
   - Monitor image loading metrics in production