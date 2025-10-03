import * as React from "react"

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: keyof JSX.IntrinsicElements
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, children, as: Component = "span", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className="absolute w-px h-px p-0 -m-px overflow-hidden clip-rect(0,0,0,0) whitespace-nowrap border-0"
        {...props}
      >
        {children}
      </Component>
    )
  }
)

VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }
import * as React from 'react'

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: keyof JSX.IntrinsicElements
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(({ className, children, as: Component = 'span', ...props }, ref) => {
  return (
    <Component
      ref={ref}
      className="absolute w-px h-px p-0 -m-px overflow-hidden clip-rect(0,0,0,0) whitespace-nowrap border-0"
      {...props}
    >
      {children}
    </Component>
  )
})

VisuallyHidden.displayName = 'VisuallyHidden'

export { VisuallyHidden }
