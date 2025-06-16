"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error) {
          console.error("Error getting session:", error)
          setError(error.message)
        } else {
          setUser(session?.user ?? null)
        }
      } catch (err: any) {
        console.error("Unexpected error getting session:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)
      setUser(session?.user ?? null)
      setError(null)
      setLoading(false)

      // Create or update profile when user signs up or signs in
      if ((event === "SIGNED_UP" || event === "SIGNED_IN") && session?.user) {
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .single()

          if (!existingProfile) {
            // Create profile if it doesn't exist
            const { error: profileError } = await supabase.from("profiles").insert({
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || null,
              phone: session.user.user_metadata?.phone || null,
              location: session.user.user_metadata?.location || null,
            })

            if (profileError) {
              console.error("Error creating profile:", profileError)
            } else {
              console.log("Profile created successfully")
            }
          }
        } catch (err) {
          console.error("Error in profile creation:", err)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        setError(error.message)
        alert(`Error signing out: ${error.message}`)
      } else {
        setUser(null)
        console.log("Successfully signed out")
      }
    } catch (err: any) {
      console.error("Unexpected error signing out:", err)
      setError(err.message)
      alert(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, loading, error, signOut }}>{children}</AuthContext.Provider>
}
