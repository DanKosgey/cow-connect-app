// DEPRECATED compatibility layer
// This file previously exported the legacy `useToast` and `toast` store.
// During the migration we now provide a lightweight compatibility shim that
// re-exports the new `useToastNotifications` hook and exposes minimal legacy
// helpers so older snapshot code continues to work while we migrate callers.

import useToastNotifications from '@/hooks/useToastNotifications'
import { addToast, removeToast, getToasts } from '@/lib/toastStore'

// New hook (preferred)
export { default as useToastNotifications } from '@/hooks/useToastNotifications'
export default useToastNotifications

// Legacy-style `toast` helper (minimal shim)
export function toast(payload: { title?: string; description?: string; variant?: any }) {
	const id = addToast({ title: payload.title, description: payload.description, variant: payload.variant })
	return {
		id,
		dismiss: () => removeToast(id),
		update: (p: any) => {
			// No-op minimal update; keep shape for compatibility
			// Real updates should use the new toast store API if extended
		},
	}
}

// Legacy hook wrapper exposing a minimal compatibility surface.
export function useToast() {
	const { show, error, success } = useToastNotifications()

	return {
		toasts: getToasts(),
		toast: (payload: any) => toast(payload),
		dismiss: (id?: string) => id && removeToast(id),
		// keep helpers for convenience
		show,
		error,
		success,
	}
}

