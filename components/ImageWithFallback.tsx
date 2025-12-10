"use client"
import React, { useState, useMemo, useEffect, useRef } from 'react'

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string
  priority?: boolean // For above-the-fold images
}

export default function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  style, 
  fallback = '/placeholder.jpg', 
  priority = false,
  ...rest 
}: Props) {
  const [errored, setErrored] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inView, setInView] = useState(priority) // Start loading immediately if priority
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Memoize the image source to prevent unnecessary re-renders
  const imageSrc = useMemo(() => src, [src])

  // Intersection Observer for lazy loading
  useEffect(() => {
    // If priority, skip intersection observer
    if (priority || !imageSrc || errored) return

    // Only set up observer if browser supports it
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true) // Fallback: load immediately
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            // Disconnect observer once image is in view
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current)
            }
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    )

    observerRef.current = observer

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current)
      }
    }
  }, [priority, imageSrc, errored])

  // Preload image when in view
  useEffect(() => {
    if (!inView || !imageSrc || errored) return

    // Create a new image to preload
    const img = new Image()
    img.src = imageSrc as string
    
    img.onload = () => {
      setLoading(false)
    }
    
    img.onerror = () => {
      setErrored(true)
      setLoading(false)
    }
  }, [inView, imageSrc, errored])

  if (!imageSrc || errored) {
    return (
      <div 
        ref={imgRef}
        className={`${className} bg-gray-100 flex items-center justify-center`}
        style={style}
      >
        <img
          src={fallback}
          alt={alt || 'placeholder'}
          className="w-full h-full object-cover opacity-50"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div 
      ref={imgRef}
      className={`${className} relative`}
      style={style}
    >
      {/* Loading skeleton */}
      {loading && inView && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center"
          style={{ backgroundSize: '200% 100%' }}
        >
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Actual image - only render when in view */}
      {inView && (
        <img
          src={imageSrc as string}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          style={{ ...style, position: loading ? 'absolute' : 'relative' }}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => {
            setLoading(false)
          }}
          onError={(e) => {
            setErrored(true)
            setLoading(false)
            const target = e.currentTarget as HTMLImageElement
            target.onerror = null
          }}
          {...rest}
        />
      )}
    </div>
  )
}
