"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DatabaseTest() {
  const { user } = useAuth()
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const runTests = async () => {
    setTesting(true)
    const testResults: string[] = []

    try {
      // Test 1: Check connection
      testResults.push("🔗 Testing database connection...")
      const { data: connectionTest, error: connectionError } = await supabase.from("profiles").select("count").limit(1)

      if (connectionError) {
        testResults.push(`❌ Connection failed: ${connectionError.message}`)
      } else {
        testResults.push("✅ Database connection successful")
      }

      // Test 2: Check items table
      testResults.push("📦 Testing items table...")
      const { data: itemsTest, error: itemsError } = await supabase.from("items").select("id").limit(1)

      if (itemsError) {
        testResults.push(`❌ Items table error: ${itemsError.message}`)

        // Try food_items table as fallback
        testResults.push("🔄 Trying food_items table...")
        const { data: foodTest, error: foodError } = await supabase.from("food_items").select("id").limit(1)

        if (foodError) {
          testResults.push(`❌ Food_items table error: ${foodError.message}`)
        } else {
          testResults.push("✅ Food_items table accessible")
        }
      } else {
        testResults.push("✅ Items table accessible")
      }

      // Test 3: Check storage
      testResults.push("🖼️ Testing storage...")
      const { data: storageTest, error: storageError } = await supabase.storage
        .from("item-images")
        .list("", { limit: 1 })

      if (storageError) {
        testResults.push(`❌ Storage error: ${storageError.message}`)
      } else {
        testResults.push("✅ Storage accessible")
      }

      // Test 4: Check user authentication
      testResults.push("👤 Testing user authentication...")
      if (user) {
        testResults.push(`✅ User authenticated: ${user.email}`)
      } else {
        testResults.push("❌ User not authenticated")
      }
    } catch (error: any) {
      testResults.push(`💥 Test failed: ${error.message}`)
    }

    setResults(testResults)
    setTesting(false)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={testing} className="mb-4">
          {testing ? "Running Tests..." : "Run Database Tests"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
