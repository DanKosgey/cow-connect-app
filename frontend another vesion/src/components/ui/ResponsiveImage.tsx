import * as React from "react"

export interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  sizes?: string
  srcSet?: string
  lazy?: boolean
}

const ResponsiveImage = React.forwardRef<HTMLImageElement, ResponsiveImageProps>(
  ({ src, alt, sizes, srcSet, lazy = true, className, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        sizes={sizes}
        srcSet={srcSet}
        loading={lazy ? "lazy" : undefined}
        className={className}
        {...props}
      />
    )
  }
)

ResponsiveImage.displayName = "ResponsiveImage"

export { ResponsiveImage }