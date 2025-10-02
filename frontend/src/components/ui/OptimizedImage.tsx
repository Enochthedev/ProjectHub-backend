/**
 * Optimized image component using Next.js Image with performance enhancements
 */
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 border-2 border-gray-200",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-gray-400 text-sm">
          Failed to load image
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse border-2 border-gray-200"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes || (fill ? '100vw' : undefined)}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}

/**
 * Avatar component with optimized image loading
 */
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  fallback,
  className 
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const sizePx = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  if (!src) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-200 border-2 border-gray-300 text-gray-600 font-medium",
          sizeClasses[size],
          className
        )}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizePx[size]}
      height={sizePx[size]}
      className={cn(
        "border-2 border-gray-300 object-cover",
        sizeClasses[size],
        className
      )}
      quality={90}
      priority={size === 'xl'}
    />
  );
}

/**
 * Project thumbnail component with lazy loading
 */
interface ProjectThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ProjectThumbnail({ src, alt, className }: ProjectThumbnailProps) {
  if (!src) {
    return (
      <div 
        className={cn(
          "w-full h-48 bg-gray-100 border-2 border-gray-200 flex items-center justify-center",
          className
        )}
      >
        <div className="text-gray-400 text-sm">No image</div>
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={200}
      className={cn("w-full h-48 object-cover border-2 border-gray-200", className)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={80}
    />
  );
}