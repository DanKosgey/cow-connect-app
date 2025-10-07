type ToastPayload = {
  title?: string
  description?: string
}

// Minimal, synchronous hook that mirrors the project's existing API surface.
// It currently logs to console and returns helpers so components can call it
// without changing behavior. Later we'll wire it to a persistent toast store.

import { addToast, removeToast } from '@/lib/toastStore'

export default function useToastNotifications() {
  function show(payload: ToastPayload) {
    const id = addToast({ title: payload.title, description: payload.description, variant: 'default' })
    // auto-dismiss default toasts after 4s
    setTimeout(() => removeToast(id), 4000)
    return id
  }

  function error(title: string, description?: string) {
    const id = addToast({ title, description, variant: 'error' })
    // longer visibility for errors
    setTimeout(() => removeToast(id), 8000)
    return id
  }

  function success(title: string, description?: string) {
    const id = addToast({ title, description, variant: 'success' })
    setTimeout(() => removeToast(id), 4000)
    return id
  }

  return {
    show,
    error,
    success,
  }
}

