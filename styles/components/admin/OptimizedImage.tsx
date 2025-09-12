"use client"

import { useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Package } from "lucide-react"

interface OptimizedImageProps {
  src: string | null
  alt: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = "", 
  fill = false, 
  width, 
  height 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Debug logging
  console.log("🖼️ OptimizedImage render:", { src, alt, hasError, isLoading })

  if (!src || src.trim() === '') {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <Package className="h-8 w-8 text-gray-400" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Image failed to load</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <Skeleton className={`absolute inset-0 ${className}`} />
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => {
          console.log("✅ Image loaded successfully:", src)
          setIsLoading(false)
        }}
        onError={(e) => {
          console.error("❌ Image failed to load:", src, e)
          setIsLoading(false)
          setHasError(true)
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
      />
    </div>
  )
}
