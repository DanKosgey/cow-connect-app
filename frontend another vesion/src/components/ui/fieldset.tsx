import * as React from "react"
import { cn } from "@/lib/utils"

export interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string
  error?: boolean
}

const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(
  ({ className, legend, error, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn(
          "border border-input rounded-md p-4",
          error && "border-destructive",
          className
        )}
        {...props}
      >
        {legend && (
          <legend className="text-sm font-medium px-1">
            {legend}
          </legend>
        )}
        <div className="mt-2">
          {children}
        </div>
      </fieldset>
    )
  }
)

Fieldset.displayName = "Fieldset"

export { Fieldset }