# UI_MIGRATION_TODO.md

This document is a single, actionable migration plan and checklist for moving high-value UI "treasures" from `frontend another vesion` into the current frontend. Each checkbox represents a small, trackable task (roughly 5–30 minutes each). Follow the phases in order: Foundation → Core → Advanced → Cleanup.

---

## 1. MIGRATION OVERVIEW

- Total treasures to migrate: 14
- Estimated complexity: Medium → High (depends on wiring and theming differences)
- Dependencies to install: see Section 5
- Breaking changes to watch for:
  - Tailwind/Design token differences between the two frontends (class names like `bg-muted`, `bg-card` may map to different theme tokens)
  - `next-themes` / theme provider differences if current app doesn't use it
  - Duplicate toast systems (Sonner vs custom) — ensure a single provider is used
  - Radix primitives may need React version compatibility checks

---

## 2. FILES TO CREATE (New Components)

Create the following files in your current frontend under `src/components/ui/`. Each entry points to the source file in `frontend another vesion` and the line range to copy from.

- [ ] Path: `src/components/ui/skeleton.tsx`
    Source: `frontend another vesion/src/components/ui/skeleton.tsx`
    Lines: 1-15
    Dependencies: `@/lib/utils` (cn) — small utility to merge classNames
    Priority: ⭐⭐⭐⭐
    Notes: tiny wrapper that returns <div class="animate-pulse rounded-md bg-muted" />. Excellent for inline skeleton placeholders.

- [ ] Path: `src/components/ui/SkeletonLoader.tsx`
    Source: `frontend another vesion/src/components/ui/SkeletonLoader.tsx`
    Lines: 1-82
    Dependencies: none (React)
    Priority: ⭐⭐⭐⭐⭐
    Notes: multi-type skeleton loader (card, list, chart, dashboard). Use this for lists and dashboards to improve perceived performance.

- [ ] Path: `src/components/ui/toast.tsx`
    Source: `frontend another vesion/src/components/ui/toast.tsx`
    Lines: 1-125
    Dependencies: `@radix-ui/react-toast`, `class-variance-authority` (cva), `lucide-react` (icons), `@/lib/utils` (cn)
    Priority: ⭐⭐⭐⭐⭐
    Notes: Radix-based accessible toast primitives with variants and ARIA attributes. Copy verbatim and adapt theme classes if needed.

- [ ] Path: `src/components/ui/toaster.tsx`
    Source: `frontend another vesion/src/components/ui/toaster.tsx`
    Lines: 1-40
    Dependencies: `use-toast` (local hook), `ToastProvider` from `toast.tsx`
    Priority: ⭐⭐⭐⭐⭐
    Notes: renderer that maps toast store to UI; wire into app root (see wiring checklist).

- [ ] Path: `src/components/ui/sonner.tsx`
    Source: `frontend another vesion/src/components/ui/sonner.tsx`
    Lines: 1-140
    Dependencies: `sonner`, `next-themes` (optional) — used for promise/loading style toasts
    Priority: ⭐⭐⭐⭐
    Notes: optional; includes Sonner Toaster wrapper that respects theme.

- [ ] Path: `src/hooks/useToastNotifications.ts`
    Source: `frontend another vesion/src/hooks/useToastNotifications.ts`
    Lines: 1-194
    Dependencies: `sonner` (optional), local `use-toast` hook + custom toast API
    Priority: ⭐⭐⭐⭐⭐
    Notes: unified API for success/error/loading/promise toasts. Highly recommended.

- [ ] Path: `src/hooks/useNotificationSystem.ts`
    Source: `frontend another vesion/src/hooks/useNotificationSystem.ts`
    Lines: 1-220
    Dependencies: `use-toast` (local), WebSocket/notifications code (app-specific)
    Priority: ⭐⭐⭐⭐
    Notes: maps real-time notifications to toast calls; ensure user preferences are respected.

- [ ] Path: `src/components/ui/LoadingSpinner.tsx`
    Source: `frontend another vesion/src/components/ui/LoadingSpinner.tsx`
    Lines: 1-48
    Dependencies: none (React + Tailwind classes)
    Priority: ⭐⭐⭐⭐
    Notes: svg spinner with size and optional message.

- [ ] Path: `src/components/ui/button.tsx`
    Source: `frontend another vesion/src/components/ui/button.tsx`
    Lines: 1-56
    Dependencies: `class-variance-authority` (cva), `@radix-ui/react-slot` (Slot), `@/lib/utils` (cn)
    Priority: ⭐⭐⭐⭐⭐
    Notes: central button tokens (variant/size); adopt into design system for consistent buttons.

- [ ] Path: `src/components/ui/input.tsx`
    Source: `frontend another vesion/src/components/ui/input.tsx`
    Lines: 1-76
    Dependencies: `@/lib/utils` (cn)
    Priority: ⭐⭐⭐⭐⭐
    Notes: includes mobile-specific `inputMode` and `enterKeyHint`, plus accessible error/help rendering.

- [ ] Path: `src/components/ui/card.tsx`
    Source: `frontend another vesion/src/components/ui/card.tsx`
    Lines: 1-87
    Dependencies: `@/lib/utils` (cn)
    Priority: ⭐⭐⭐⭐
    Notes: semantic subcomponents (Header, Title, Description, Content, Footer) for consistent cards.

- [ ] Path: `src/components/ui/dialog.tsx`
    Source: `frontend another vesion/src/components/ui/dialog.tsx`
    Lines: 1-220
    Dependencies: `@radix-ui/react-dialog`, `lucide-react` (X icon), `@/lib/utils` (cn), `useFocusTrap` & `useFocusReturn` hooks
    Priority: ⭐⭐⭐⭐⭐
    Notes: Radix modal with focus trapping and return. Critical for accessible dialogs.

- [ ] Path: `src/components/ui/VisuallyHidden.tsx`
    Source: `frontend another vesion/src/components/ui/VisuallyHidden.tsx`
    Lines: 1-21
    Dependencies: none
    Priority: ⭐⭐⭐⭐
    Notes: utility for screen-reader-only content.

- [ ] Path: `src/components/ui/SkipLink.tsx`
    Source: `frontend another vesion/src/components/ui/SkipLink.tsx`
    Lines: 1-26
    Dependencies: `@/lib/utils` (cn)
    Priority: ⭐⭐⭐⭐
    Notes: skip-to-main anchor with focus reveal; quick accessibility win.

---

## 3. FILES TO EDIT (Modifications)

Modify these files in the current frontend to wire new components in and replace old imports.

- [ ] Path: `src/main.tsx` or `src/index.tsx` (app entry)
    Action: Add `Toaster` (toast provider) and Sonner Toaster wrapper at app root
    Location in file: near root React render (where <App /> is mounted)
    Code to add (example):
    ```tsx
    // ...existing imports
    import { Toaster } from '@/components/ui/toaster'
    import '@/components/ui/sonner' // optional if using Sonner wrapper

    // ...existing render
    <React.StrictMode>
      <App />
      <Toaster />
      <SonnerToaster /> // optional, only if you copied sonner.tsx and want both
    </React.StrictMode>
    ```
    Priority: ⭐⭐⭐⭐⭐
    Notes: ensure only a single toast root is rendered.

- [ ] Path: `src/App.tsx` (if present)
    Action: Import `SkipLink` and add to top of layout (optional)
    Location in file: top-level layout return before main content
    Code to add:
    ```tsx
    import { SkipLink } from '@/components/ui/SkipLink'
    // inside JSX: <SkipLink targetId="main-content" />
    ```
    Priority: ⭐⭐⭐

- [ ] Path: all pages/components that use toasts (search for `useToastContext` / `ToastWrapper` / custom toasts)
    Action: Replace old toast usage with `useToastNotifications` or `use-toast` API
    Location in file: where toast calls happen (e.g., page effects and form handlers)
    Code to add: `const { showSuccess, showError, showLoading, promiseToast } = useToastNotifications()`
    Priority: ⭐⭐⭐⭐⭐
    Notes: examples found in `frontend another vesion` pages: `src/pages/tasks.tsx`, `StaffPortal.tsx`, `StaffCollections.tsx`, `FarmerRegister.tsx` — replicate similar usage.

- [ ] Path: pages/components using inputs/buttons (search for `input`, `button` components)
    Action: Replace ad-hoc inputs & buttons with new `Input` and `Button` variants
    Location in file: imports and JSX where <input> or old <Button> used
    Code to add: `import { Input } from '@/components/ui/input'` and replace markup accordingly
    Priority: ⭐⭐⭐⭐
    Notes: keep old props mapping (e.g., pass `error`, `helpText`, `id`).

- [ ] Path: pages with modals/dialogs
    Action: Replace custom modal implementations with `Dialog` and `DialogContent` to get focus trapping
    Location in file: modal component imports and top-level render
    Code to add: `import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'`
    Priority: ⭐⭐⭐⭐

- [ ] Path: `src/components/ToastWrapper.tsx` (if exists in current code)
    Action: Evaluate and either remove or adapt to new system
    Location in file: replace usage across app
    Code to add: migration notes rather than exact code
    Priority: ⭐⭐⭐⭐
    Notes: Do not delete until Toaster and hooks are tested.

---

## 4. FILES TO DELETE (Replaced/Obsolete)

Only remove after verifying the new system works. Keep backups or branches.

- [ ] Path: `src/components/ToastWrapper.tsx` (existing/legacy)
    Reason: Replaced by `toast.tsx` + `toaster.tsx` + `useToastNotifications`
    Check first: verify no other code depends exclusively on legacy API
    Backup: Yes — keep a copy under `migrations/backup/` or a separate branch

- [ ] Path: any legacy `toast` implementations or duplicate Sonner/third-party wrappers
    Reason: avoid duplicate toast providers
    Check first: search for `Toaster`, `toast-wrapper`, `useToastContext`
    Backup: Yes

---

## 5. DEPENDENCIES TO INSTALL

- [ ] Package: `@radix-ui/react-toast`
    Version: latest compatible with React in your project
    Reason: toast primitives used in `toast.tsx`
    Install command: `npm install @radix-ui/react-toast`

- [ ] Package: `class-variance-authority` (cva)
    Version: latest
    Reason: used for `toast` and `button` variant styles
    Install command: `npm install class-variance-authority`

- [ ] Package: `sonner`
    Version: ^2 (match frontend another vesion package.json)
    Reason: nice promise/loading toasts and UX in `useToastNotifications` and `sonner.tsx`
    Install command: `npm install sonner`

- [ ] Package: `lucide-react`
    Version: latest
    Reason: icons such as `X` in dialog/toast
    Install command: `npm install lucide-react`

- [ ] Package: `@radix-ui/react-slot` (if using Slot for button asChild)
    Install command: `npm install @radix-ui/react-slot`

- [ ] Optional: `next-themes` (if Sonner theme wrapper uses it)
    Install command: `npm install next-themes`

Notes: pin versions if your project has strict compatibility requirements.

---

## 6. DEPENDENCIES TO REMOVE

Check before removing — search codebase for usages.

- [ ] Package: [example] `old-toast-lib`
    Reason: replaced by Sonner or Radix-based toasts
    Check first: `grep -R "old-toast-lib" -n`
    Remove command: `npm uninstall old-toast-lib`

---

## 7. INTEGRATION STEPS (Ordered by Priority)

Phase 1: Foundation (Do First)

- [x] Step 1: Install dependencies (performed)
    - [x] `npm install @radix-ui/react-toast class-variance-authority lucide-react sonner @radix-ui/react-slot`
    - [ ] (optional) `npm install next-themes`

- [x] Step 2: Create base UI utilities (files added)
    - [x] Create `src/components/ui/skeleton.tsx` (from `frontend another vesion/src/components/ui/skeleton.tsx` lines 1-15)
    - [x] Create `src/components/ui/SkeletonLoader.tsx` (lines 1-82)
    - [x] Create `src/components/ui/VisuallyHidden.tsx` (lines 1-21)
    - [x] Create `src/components/ui/SkipLink.tsx` (lines 1-26)
    - [x] Create `src/components/ui/LoadingSpinner.tsx` (added as part of foundation)

Checkpoint: Phase 1 completed

- Actions taken:
  - Installed UI dependencies listed above (some were already present; npm install completed).
  - Added foundation components: `skeleton.tsx`, `SkeletonLoader.tsx`, `VisuallyHidden.tsx`, `SkipLink.tsx`, `LoadingSpinner.tsx`.
  - Added a small unified hook `src/hooks/useToastNotifications.ts` to help Phase 2 integration (wrapper around existing `use-toast` and Sonner promise).
  - Verified build: `npm run build` completed successfully (informational warnings only).

Notes:
- These foundation files are passive until imported; they don't change runtime behavior by themselves.
- Next recommended step: Phase 2 — analyze and harmonize the existing toast system (repo already contains `use-toast`, `toast.tsx`, `toaster.tsx`, and `sonner.tsx`).

Phase 2: Core Components

- [ ] Step 3: Toast system
    - [ ] Create `src/components/ui/toast.tsx` (lines 1-125)
    - [ ] Create `src/components/ui/toaster.tsx` (lines 1-40)
    - [ ] Create `src/components/ui/sonner.tsx` (optional; lines 1-140)
    - [ ] Create `src/hooks/useToastNotifications.ts` (lines 1-194)
    - [ ] Create `src/components/ui/use-toast.ts` (or adapt the existing local one)
    - [ ] Wire `Toaster` in `src/main.tsx` (app root)

- [ ] Step 4: Buttons / Inputs / Card
    - [ ] Create `src/components/ui/button.tsx` (lines 1-56)
    - [ ] Create `src/components/ui/input.tsx` (lines 1-76)
    - [ ] Create `src/components/ui/card.tsx` (lines 1-87)

- [ ] Step 5: Dialogs & Focus Utilities
    - [ ] Create `src/components/ui/dialog.tsx` (lines 1-220)
    - [ ] Ensure `useFocusTrap` and `useFocusReturn` hooks exist or port them from `frontend another vesion` (these are small utility hooks in `src/hooks`)

Phase 3: Advanced Features

- [ ] Step 6: Notification system (WebSocket integration)
    - [ ] Create `src/hooks/useNotificationSystem.ts` (lines 1-220)
    - [ ] Integrate with WebSocket connection code and user preferences

- [ ] Step 7: Loading & UX polish
    - [ ] Create `src/components/ui/LoadingSpinner.tsx` (lines 1-48)
    - [ ] Start replacing plain "Loading..." text with `Skeleton`/`SkeletonLoader` where appropriate

Phase 4: Cleanup & Testing

- [ ] Step 8: Remove old files (after verification)
    - [ ] Delete legacy toast wrappers (see Section 4)
    - [ ] Delete duplicate modal implementations if replaced by `Dialog`

- [ ] Step 9: Test all integrations
    - [ ] Test toasts work across pages (manual + unit test)
    - [ ] Test modal focus trap (keyboard only)
    - [ ] Test skeleton loaders visually during slow network
    - [ ] Test mobile input hints and inputMode behaviors

---

## 8. WIRING CHECKLIST

- [ ] Toast Provider wrapped in App root
    File: `src/main.tsx` or `src/index.tsx`
    Code location: after `<App />` mount or inside root layout near end of render

- [ ] Import new components where needed
    - [ ] Replace old Button in core components/pages with `src/components/ui/button.tsx`
    - [ ] Replace old Input with `src/components/ui/input.tsx`
    - [ ] Add skeletons to lists/dashboards: replace `isLoading ? 'Loading' : ...` with `<SkeletonLoader type="list" count={...} />`

---

## 9. TESTING CHECKLIST

For each treasure integrated, perform the following tests:

- [ ] Component: `Toast` / `Toaster`
    - [ ] Visual test: Appears and stacks correctly
    - [ ] Functional test: show/dismiss, toast.action works
    - [ ] Accessibility: `aria-live` values, screen reader announcements
    - [ ] Mobile: tap to dismiss
    - [ ] Edge: long messages, many toasts at once

- [ ] Component: `SkeletonLoader` / `Skeleton`
    - [ ] Visual: placeholder shapes match intended layout
    - [ ] Functional: replaced state when content arrives
    - [ ] Accessibility: add `aria-live` or alternate text for long loads

- [ ] Component: `Dialog` (modal)
    - [ ] Keyboard navigation: focus trapped, Escape closes
    - [ ] Focus return: focus returns to trigger
    - [ ] Screen reader: title/description announced

- [ ] Component: `Input`
    - [ ] Mobile: `inputMode` and keyboard hints
    - [ ] Error state: `aria-invalid` & `role="alert"` messages
    - [ ] Edge: missing id fallback behavior

---

## 10. ROLLBACK PLAN

If something breaks during the migration:

- Git commit before each phase: `git commit -m "ui:migrate - <phase> - add <component>"`
- Backup files location: `migrations/backup/<timestamp>/` (store copies if deleting)
- Rollback commands:
  - Revert last commit: `git revert <commit-hash>`
  - Or return to a known branch: `git checkout -b restore-before-ui-migration main`

---

## 11. QUICK REFERENCE

File Mapping Table (examples)

| Old Component (frontend another vesion) | New Component (target path) | Status | Priority |
|---|---:|---:|---:|
| `src/components/ui/toast.tsx` | `src/components/ui/toast.tsx` | [ ] | ⭐⭐⭐⭐⭐ |
| `src/components/ui/toaster.tsx` | `src/components/ui/toaster.tsx` | [ ] | ⭐⭐⭐⭐⭐ |
| `src/components/ui/SkeletonLoader.tsx` | `src/components/ui/SkeletonLoader.tsx` | [ ] | ⭐⭐⭐⭐⭐ |
| `src/components/ui/dialog.tsx` | `src/components/ui/dialog.tsx` | [ ] | ⭐⭐⭐⭐⭐ |

Import Changes (examples)

| Old Import | New Import | Files Affected |
|---|---|---|
| `import { useToastContext } from '@/components/ToastWrapper'` | `import useToastNotifications from '@/hooks/useToastNotifications'` | pages/forms, staff pages |
| `import Card from './old-card'` | `import { Card } from '@/components/ui/card'` | dashboard pages |

---

## 12. PROGRESS TRACKER

Overall Progress: [ ] 0/?? tasks complete

Phase 1 Foundation:     [ ] 0/X
Phase 2 Core:           [ ] 0/X
Phase 3 Advanced:       [ ] 0/X
Phase 4 Cleanup:        [ ] 0/X

Tip: mark each small file creation or wiring change as a separate git commit.

---

## 13. NOTES & WARNINGS

- ⚠️ Theme mismatch: Tailwind color names in `frontend another vesion` (e.g., `bg-muted`, `bg-card`, `text-muted-foreground`) may not exist in your current Tailwind config — map tokens first.
- ⚠️ Duplicate providers: ensure only one toast provider is mounted. If you keep Sonner + Radix, decide responsibility (Sonner for promise/loading toasts, Radix for styled stack) and document.
- 💡 Tip: port `use-toast.ts` first (a minimal toast store) so `toaster.tsx` can be rendered and used by other components.
- 🐛 Known issue: mixing `next-themes` usage in non-next projects will require small changes — Sonner theme wrapper can be made conditional.
- 📚 Useful docs inside `frontend another vesion` to copy over for team knowledge: `docs/COMPONENT_LIBRARY.md`, `docs/TOAST_ACCESSIBILITY.md`, `docs/KEYBOARD_NAVIGATION.md`.

---

If you'd like, I can now:
- create the files listed under "Files to Create" in your current `src/components/ui/` (one-by-one or as a bundle),
- or prepare a focused PR that wires `Toaster` into `src/main.tsx` and demonstrates toasts + a sample skeleton usage on a small demo route.

Reply with which next step you prefer and I'll start implementing it.
