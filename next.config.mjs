/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Configure for Replit proxy environment
  allowedDevOrigins: ['*.replit.dev'],
  async headers() {
    // Get allowed origin from environment variable, default to * for development
    const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || 
      (process.env.NODE_ENV === 'production' ? '' : '*');
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Only set CORS header if allowedOrigin is specified
          ...(allowedOrigin ? [{
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigin,
          }] : []),
        ],
      },
    ]
  },
}

export default nextConfig
