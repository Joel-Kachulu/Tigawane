import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from "@/contexts/AuthContext"

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
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
