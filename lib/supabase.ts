import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string
        }
      }
      food_items: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string
          quantity: string
          expiry_date: string | null
          pickup_location: string
          image_url: string | null
          user_id: string
          status: "available" | "claimed" | "completed"
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: string
          quantity: string
          expiry_date?: string | null
          pickup_location: string
          image_url?: string | null
          user_id: string
          status?: "available" | "claimed" | "completed"
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string
          quantity?: string
          expiry_date?: string | null
          pickup_location?: string
          image_url?: string | null
          user_id?: string
          status?: "available" | "claimed" | "completed"
          created_at?: string
        }
      }
      claims: {
        Row: {
          id: string
          food_item_id: string
          claimer_id: string
          owner_id: string
          status: "pending" | "accepted" | "rejected" | "completed"
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          food_item_id: string
          claimer_id: string
          owner_id: string
          status?: "pending" | "accepted" | "rejected" | "completed"
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          food_item_id?: string
          claimer_id?: string
          owner_id?: string
          status?: "pending" | "accepted" | "rejected" | "completed"
          message?: string | null
          created_at?: string
        }
      }
    }
  }
}
