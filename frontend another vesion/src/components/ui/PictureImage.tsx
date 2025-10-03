import * as React from "react"

export interface PictureSource {
  srcSet: string
  media?: string
  type?: string
}

export interface PictureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  sources?: PictureSource[]
  src: string
  alt: string
  lazy?: boolean
  fallbackFormat?: 'webp' | 'jpeg' | 'png'
}

const PictureImage = React.forwardRef<HTMLImageElement, PictureImageProps>(
  ({ sources, src, alt, lazy = true, fallbackFormat = 'jpeg', ...props }, ref) => {
    // Generate webp fallback if needed
    const webpSrc = src.replace(/\.(jpe?g|png|gif)$/i, '.webp')
    
    return (
      <picture>
        {sources?.map((source, index) => (
          <source
            key={index}
            srcSet={source.srcSet}
            media={source.media}
            type={source.type}
          />
        ))}
        
        {/* WebP fallback for better compression */}
        {fallbackFormat === 'webp' && (
          <source
            srcSet={webpSrc}
            type="image/webp"
          />
        )}
        
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : undefined}
          {...props}
        />
      </picture>
    )
  }
)

PictureImage.displayName = "PictureImage"

export { PictureImage }