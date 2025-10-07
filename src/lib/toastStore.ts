export type ToastVariant = 'default' | 'success' | 'error' | 'loading'

export type Toast = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  createdAt: number
}

let toasts: Toast[] = []

const listeners = new Set<(t: Toast[]) => void>()

function notify() {
  const snapshot = [...toasts]
  listeners.forEach((fn) => fn(snapshot))
}

export function subscribe(fn: (t: Toast[]) => void): () => void {
  listeners.add(fn)
  // provide initial state immediately
  fn([...toasts])
  return () => {
    listeners.delete(fn)
  }
}

export function addToast(payload: Partial<Toast>): string {
  const id = payload.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  const t: Toast = {
    id,
    title: payload.title,
    description: payload.description,
    variant: payload.variant ?? 'default',
    createdAt: Date.now(),
  }

  // newest first
  toasts = [t, ...toasts]
  notify()
  return id
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function clearToasts() {
  toasts = []
  notify()
}

export function getToasts() {
  return [...toasts]
}
