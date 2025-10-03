import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string
}

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ className, targetId, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={cn(
          "absolute top-0 left-0 z-50 px-4 py-2 bg-primary text-primary-foreground font-medium transform -translate-y-full transition-transform duration-200 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        {...props}
      >
        {children || "Skip to main content"}
      </a>
    )
  }
)

SkipLink.displayName = "SkipLink"

export { SkipLink }
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string
}

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(({ className, targetId, children, ...props }, ref) => {
  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        'absolute top-0 left-0 z-50 px-4 py-2 bg-primary text-primary-foreground font-medium transform -translate-y-full transition-transform duration-200 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      {...props}
    >
      {children || 'Skip to main content'}
    </a>
  )
})

SkipLink.displayName = 'SkipLink'

export { SkipLink }
