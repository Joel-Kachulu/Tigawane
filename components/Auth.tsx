"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import { getCityCoordinates } from "@/lib/locationService"

interface AuthProps {
  onBackToLanding?: () => void
}

export default function Auth({ onBackToLanding }: AuthProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [activeTab, setActiveTab] = useState("signin")

  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Attempting to sign up user:", email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation redirect
          data: {
            full_name: fullName,
            phone,
            location,
          },
        },
      })

      if (error) {
        console.error("Supabase signup error:", error)
        throw error
      }

      console.log("Signup response:", data)

      // Check if user was created successfully
      if (data.user) {
        console.log("User created successfully:", data.user.id)
        
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verify profile was created
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (profileError) {
          console.error("Profile creation error:", profileError)
          // Get location coordinates if location is provided
          let latitude = null;
          let longitude = null;
          
          if (location) {
            const cityLocation = getCityCoordinates(location);
            if (cityLocation) {
              latitude = cityLocation.latitude;
              longitude = cityLocation.longitude;
            }
          }

          // Try to create profile manually if trigger failed
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: fullName,
              phone,
              location,
              latitude,
              longitude,
            })
          
          if (insertError) {
            console.error("Manual profile creation failed:", insertError)
          } else {
            console.log("Profile created manually")
          }
        } else {
          console.log("Profile created by trigger:", profile)
        }

        alert("Account created successfully! Please sign in with your email and password.")

        // Reset form and switch to sign in tab
        setEmail("")
        setPassword("")
        setFullName("")
        setPhone("")
        setLocation("")
        
        // Switch to sign in tab
        setActiveTab("signin")
      } else {
        throw new Error("User creation failed - no user data returned")
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      alert(error.message || "Error creating account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Refresh session explicitly to avoid stale state
      const { data: sessionData } = await supabase.auth.getSession()

      // Redirect to home/dashboard after login
      router.push("/")
    } catch (error: any) {
      console.error("Sign in error:", error)
      alert(error.message || "Error signing in. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {onBackToLanding && (
            <div className="flex justify-start mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToLanding}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-100 p-2 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back</span>
              </Button>
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-green-700">🥗 Malawi Food Share</CardTitle>
          <CardDescription>Share food, reduce waste, help your community</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+265..."
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location (City/Area)</Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Lilongwe, Blantyre"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
