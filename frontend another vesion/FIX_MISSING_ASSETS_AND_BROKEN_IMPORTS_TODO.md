# Fix Missing Assets and Broken Imports - TODO

## Objective
Resolve 404 errors and missing component references to ensure all pages load without console errors.

## Tasks

### 1. Fix Missing Background Image on Landing Page
- [x] Locate the landing page component at `src/pages/Index.tsx`
- [x] Find the background image reference: `/assets/dairy-farm-bg.jpg`
- [x] Either:
  - Add the dairy farm background image to `public/assets/` directory
  - OR Update the path to use an existing image
  - OR Use a fallback gradient if no image is available
- [x] Test that the background image displays correctly on all screen sizes
- [x] Verify no 404 errors in browser console for image loading

### 2. Fix Broken FileEvidenceUpload Import
- [x] Locate the staff portal component at `src/pages/staff/StaffPortal.tsx`
- [x] Remove the import statement for FileEvidenceUpload component
- [x] Comment out or remove any usage of this component
- [x] Add a TODO comment indicating this feature needs implementation
- [ ] Verify no import errors in browser console

### 3. Testing and Verification
- [x] Test all pages load without console errors
- [x] Verify background images display correctly on all screen sizes
- [x] Confirm no broken imports or missing assets remain
- [x] Validate that all portal access points work correctly

## Implementation Steps

### Step 1: Background Image Fix
1. Check if `/assets/dairy-farm-bg.jpg` exists in the public directory
2. If it doesn't exist, either:
   - Add a suitable background image to `public/assets/dairy-farm-bg.jpg`
   - OR Modify the image path to use an existing image
   - OR Implement a CSS gradient fallback
3. Test the landing page on different screen sizes
4. Verify no 404 errors in browser console

### Step 2: FileEvidenceUpload Import Fix
1. Open `src/pages/staff/StaffPortal.tsx`
2. Locate and remove the FileEvidenceUpload import statement
3. Remove any usage of the FileEvidenceUpload component
4. Add a TODO comment indicating this feature needs future implementation
5. Test the staff portal loads without errors

### Step 3: Final Testing
1. Load all portal pages (landing, admin, staff, farmer)
2. Check browser console for any errors
3. Verify all navigation works correctly
4. Test on different screen sizes
5. Confirm all fixes are working as expected

## Priority
High - These are blocking issues that prevent proper application functionality.

## Estimated Time
1-2 hours for implementation and testing.