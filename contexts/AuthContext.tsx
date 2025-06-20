"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshUser: async () => {},
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

  // 🔁 Get initial session on mount
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Session error:", error)
          setError(error.message)
        }
        setUser(data?.session?.user ?? null)
      } catch (err: any) {
        console.error("Unexpected error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 🔁 Listen to auth changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔑 Auth change:", event)
      setUser(session?.user ?? null)
      setError(null)

      // ✅ Important: stop loading even if session is null
      setLoading(false)

      // 👤 Create profile only on signup
      if (event === "SIGNED_UP" && session?.user) {
        try {
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .single()

          if (!existingProfile && !profileCheckError) {
            const { error: insertError } = await supabase.from("profiles").insert({
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || null,
              phone: session.user.user_metadata?.phone || null,
              location: session.user.user_metadata?.location || null,
            })

            if (insertError) {
              console.error("Error creating profile:", insertError)
            } else {
              console.log("✅ Profile created")
            }
          }
        } catch (err) {
          console.error("Error checking or creating profile:", err)
        }
      }
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  // 🔁 Manual refresh if needed
  const refreshUser = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) setError(error.message)
      setUser(data?.session?.user ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setError(error.message)
        alert(`Error signing out: ${error.message}`)
      } else {
        setUser(null)
        console.log("🔒 Signed out")
      }
    } catch (err: any) {
      setError(err.message)
      alert(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
