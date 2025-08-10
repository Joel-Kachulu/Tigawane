import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from "@/contexts/AuthContext"
import { LocationProvider } from "@/contexts/LocationContext"

export const metadata: Metadata = {
  title: 'tigawane',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LocationProvider>
            {children}
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
