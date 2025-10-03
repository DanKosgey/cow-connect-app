import { HTMLAttributes, forwardRef } from 'react'
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass' | 'outline'
  hoverable?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'solid',
  hoverable = true,
  children,
  ...props
}, ref) => {
  const baseStyles = 'rounded-xl transition-all duration-300'
  
  const variants = {
    solid: 'bg-white shadow-lg',
    glass: 'bg-white/90 backdrop-blur-md border border-white/20',
    outline: 'border-2 border-emerald-200 bg-white/50 backdrop-blur-sm'
  }

  const hoverStyles = hoverable ? 'hover:shadow-xl hover:scale-[1.02]' : ''

  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        variants[variant],
        hoverStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

export { Card }
