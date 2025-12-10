import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from "@/contexts/AuthContext"
import { LocationProvider } from "@/contexts/LocationContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export const metadata: Metadata = {
  title: 'Tigawane - Share Food & Items in Your Community',
  description: 'Connect with your community to share food, clothes, and household items. Reduce waste and help those in need.',
  keywords: ['food sharing', 'community sharing', 'reduce waste', 'Malawi', 'donation'],
  authors: [{ name: 'Tigawane' }],
  openGraph: {
    title: 'Tigawane - Share Food & Items in Your Community',
    description: 'Connect with your community to share food, clothes, and household items.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <LocationProvider>
              {children}
            </LocationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
