/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure for Replit proxy environment
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.replit.dev'],
}

export default nextConfig
