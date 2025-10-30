"use client"
import React, { useState } from 'react'

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string
}

export default function ImageWithFallback({ src, alt, className, style, fallback = '/placeholder.jpg', ...rest }: Props) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <img
        src={fallback}
        alt={alt || 'placeholder'}
        className={className}
        style={style}
        {...rest}
      />
    )
  }

  return (
    <img
      src={src as string}
      alt={alt}
      className={className}
      style={style}
      loading={rest.loading || 'lazy'}
      onError={(e) => {
        setErrored(true)
        const target = e.currentTarget as HTMLImageElement
        target.onerror = null
      }}
      {...rest}
    />
  )
}
