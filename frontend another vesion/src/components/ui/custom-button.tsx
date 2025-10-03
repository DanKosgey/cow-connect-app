import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
}

const CustomButton = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 transform'
  
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105',
    secondary: 'bg-white text-emerald-700 border-2 border-emerald-500 hover:bg-emerald-50 shadow-lg hover:shadow-emerald-200/50 hover:scale-105',
    outline: 'bg-transparent backdrop-blur-sm border-2 border-white text-white hover:bg-white/10 shadow-lg hover:shadow-white/30 hover:scale-105',
    ghost: 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 shadow-lg hover:shadow-white/20 hover:scale-105'
  }

  const sizes = {
    sm: 'px-4 py-2.5 text-sm min-h-[44px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[44px]',
    xl: 'px-10 py-5 text-xl min-h-[44px]'
  }

  const disabledStyles = disabled || isLoading ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabledStyles,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin mr-2">⭐</span>
      ) : null}
      {children}
    </button>
  )
})

CustomButton.displayName = 'CustomButton'

export { CustomButton }
