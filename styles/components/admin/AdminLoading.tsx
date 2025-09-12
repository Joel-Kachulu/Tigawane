"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Shield, Loader2 } from "lucide-react"
import { DashboardSkeleton } from "./AdminSkeleton"

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Message */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-green-600" />
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Admin Dashboard</h2>
          <p className="text-gray-600 text-center max-w-md">
            Verifying admin privileges and loading dashboard components...
          </p>
        </div>

        {/* Dashboard Skeleton */}
        <DashboardSkeleton />
      </main>
    </div>
  )
}
