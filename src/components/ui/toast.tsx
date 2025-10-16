import * as React from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export type ToastVariant = 'default' | 'success' | 'error' | 'loading'

export type ToastProps = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
  action?: {
    label: string
    onClick: () => void
  }
}

const IconFor = (v?: ToastVariant) => {
  if (v === 'success') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  if (v === 'error') return <AlertTriangle className="h-5 w-5 text-red-500" />
  if (v === 'loading') return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
  return null
}

export const Toast: React.FC<ToastProps & { onClose?: () => void }> = ({ title, description, variant = 'default', action, onClose }) => {
  return (
    <RadixToast.Root className={`radix-toast-root w-full max-w-md rounded-md border p-3 shadow-sm flex items-start gap-3 ${variant === 'success' ? 'bg-emerald-50 border-emerald-200' : variant === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`} onOpenChange={(open) => { if (!open) onClose?.() }}>
      <div className="flex-shrink-0 mt-0.5">{IconFor(variant)}</div>
      <div className="flex-1">
        {title && <RadixToast.Title className="font-medium text-sm">{title}</RadixToast.Title>}
        {description && <RadixToast.Description className="text-sm text-muted-foreground mt-1">{description}</RadixToast.Description>}
        {action && (
          <div className="mt-3">
            <button onClick={() => { action.onClick(); onClose?.(); }} className="text-sm font-medium text-primary underline">{action.label}</button>
          </div>
        )}
      </div>
      <RadixToast.Close asChild>
        <button aria-label="Dismiss" className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </RadixToast.Close>
    </RadixToast.Root>
  )
}

export const ToastViewport: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <RadixToast.Provider>
    <RadixToast.Viewport className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-full w-96" />
    {children}
  </RadixToast.Provider>
)

export default Toast
// End of file
