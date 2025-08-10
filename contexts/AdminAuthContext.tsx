"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AdminAuthContextType {
  user: User | null
  isAdmin: boolean
  adminRole: string | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isAdmin: false,
  adminRole: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
})

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState<string | null>(null)
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
        } else if (session?.user) {
          setUser(session.user)
          await checkAdminStatus(session.user.id)
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
      console.log("Admin auth state changed:", event)
      setUser(session?.user ?? null)
      setError(null)

      if (session?.user) {
        await checkAdminStatus(session.user.id)
      } else {
        setIsAdmin(false)
        setAdminRole(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log("Checking admin status for user:", userId)

      // Use the safe RPC function that bypasses RLS
      const { data, error } = await supabase.rpc("check_user_admin_status", {
        user_uuid: userId,
      })

      console.log("Admin status check result:", { data, error })

      if (error) {
        console.error("Error with RPC admin check:", error)
        // Fallback: try direct query with service role or simpler approach
        setIsAdmin(false)
        setAdminRole(null)
      } else if (data && data.length > 0) {
        const result = data[0]
        setIsAdmin(result.is_admin)
        setAdminRole(result.is_admin ? result.admin_role : null)
        console.log("Admin status set:", { isAdmin: result.is_admin, role: result.admin_role })
      } else {
        console.log("No admin data returned")
        setIsAdmin(false)
        setAdminRole(null)
      }
    } catch (err) {
      console.error("Unexpected error checking admin status:", err)
      setIsAdmin(false)
      setAdminRole(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log("Attempting admin sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        console.log("Authentication successful, checking admin status...")
        setUser(data.user)

        // Use the safe RPC function to check admin status
        const { data: adminCheck, error: adminError } = await supabase.rpc("check_user_admin_status", {
          user_uuid: data.user.id,
        })

        console.log("Admin check during sign in:", { adminCheck, adminError })

        if (adminError || !adminCheck || adminCheck.length === 0 || !adminCheck[0].is_admin) {
          console.log("User is not an admin, signing out...")
          await supabase.auth.signOut()

          const errorMessage = `Access denied. The email "${email}" is not registered as an admin. Please contact your system administrator to get admin access.`
          throw new Error(errorMessage)
        }

        // User is admin, set the status
        const result = adminCheck[0]
        setIsAdmin(true)
        setAdminRole(result.admin_role)
        console.log("Admin sign in successful with role:", result.admin_role)
      }
    } catch (error: any) {
      console.error("Admin sign in error:", error)
      setError(error.message)
      setUser(null)
      setIsAdmin(false)
      setAdminRole(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Check if there's an active session first
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No active session, just update local state
        setUser(null)
        setIsAdmin(false)
        setAdminRole(null)
        setError(null)
        console.log("🔒 No active admin session, updating local state")
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        setError(error.message)
      } else {
        setUser(null)
        setIsAdmin(false)
        setAdminRole(null)
        setError(null)
      }
    } catch (err: any) {
      console.error("Unexpected error signing out:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAdmin,
        adminRole,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}
