"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield, Loader2, AlertCircle } from "lucide-react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { signIn, error } = useAdminAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!email || !password) {
      setLocalError("Please enter both email and password")
      return
    }

    setIsLoading(true)
    try {
      await signIn(email, password)
    } catch (error: any) {
      setLocalError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">🤝 Tigawane Admin</CardTitle>
          <CardDescription className="text-gray-600">Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Admin Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tigawane.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {displayError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {displayError}
                  {displayError.includes("not registered as an admin") && (
                    <div className="mt-2 text-xs">
                      <strong>Need admin access?</strong>
                      <br />
                      1. Sign up normally at the main app
                      <br />
                      2. Ask your system administrator to promote your account
                      <br />
                      3. Or run the admin setup scripts if you're the first admin
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In to Admin Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">🔒 Admin Access Required</p>
              <p className="text-xs">Only users with admin privileges can access this dashboard.</p>
              <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
                <strong>First time setup?</strong>
                <br />
                1. Sign up at the main app first
                <br />
                2. Run the admin setup scripts
                <br />
                3. Come back here to sign in
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
