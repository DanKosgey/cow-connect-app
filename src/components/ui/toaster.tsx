import React, { useEffect, useState } from 'react'
import { Toast, ToastViewport, ToastProps } from './toast'
import { subscribe, removeToast, getToasts } from '@/lib/toastStore'

interface ToasterProps {
  // Accept external toasts optionally, but by default use the store
  toasts?: ToastProps[]
}

export const Toaster: React.FC<ToasterProps> = ({ toasts }) => {
  const [items, setItems] = useState<ToastProps[]>(toasts ?? getToasts())

  useEffect(() => {
    if (toasts) return // controlled mode
    const unsub = subscribe((list) => setItems(list))
    return unsub
  }, [toasts])

  return (
    <ToastViewport>
      {items.map((t) => (
        <div key={t.id ?? Math.random()}>
          <Toast
            title={t.title}
            description={t.description}
            variant={t.variant as any}
            action={
              // action is optional; we support a callback on the toast object
              (t as any).action
                ? {
                    label: (t as any).action.label || 'Action',
                    onClick: () => {
                      try {
                        ;(t as any).action.onClick?.()
                      } finally {
                        t.id && removeToast(t.id)
                      }
                    },
                  }
                : undefined
            }
            onClose={() => t.id && removeToast(t.id)}
          />
        </div>
      ))}
    </ToastViewport>
  )
}

export default Toaster
