"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Flag, CheckCircle, Trash2, Eye, Calendar, User, MessageSquare } from "lucide-react"
import Image from "next/image"

interface Report {
  id: string
  item_id: string
  reporter_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  item?: {
    id: string
    title: string
    description: string | null
    image_url: string | null
    category: string
    pickup_location: string
    owner_name?: string
  }
  reporter_name?: string
}

interface ReportsManagerProps {
  onStatsUpdate: () => void
}

export default function ReportsManager({ onStatsUpdate }: ReportsManagerProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("pending")

  useEffect(() => {
    fetchReports()
  }, [statusFilter])

  const fetchReports = async () => {
    try {
      // Fetch reports
      const { data: reportsData, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get related items and user information
      const reportsWithDetails = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Get item details
          const { data: itemData } = await supabase.from("items").select("*").eq("id", report.item_id).single()

          // Get item owner name
          let ownerName = "Unknown"
          if (itemData) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", itemData.user_id)
              .single()
            ownerName = ownerProfile?.full_name || "Unknown"
          }

          // Get reporter name
          const { data: reporterProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", report.reporter_id)
            .single()

          return {
            ...report,
            item: itemData ? { ...itemData, owner_name: ownerName } : null,
            reporter_name: reporterProfile?.full_name || "Anonymous",
          }
        }),
      )

      setReports(reportsWithDetails)
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsReviewed = async (reportId: string) => {
    try {
      const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", reportId)

      if (error) throw error

      await fetchReports()
      onStatsUpdate()
      alert("Report marked as reviewed!")
    } catch (error: any) {
      console.error("Error updating report:", error)
      alert(`Error updating report: ${error.message}`)
    }
  }

  const handleDeleteItem = async (itemId: string, reportId: string) => {
    if (!confirm("Are you sure you want to delete this reported item? This action cannot be undone.")) {
      return
    }

    try {
      // Delete the item
      const { error: deleteError } = await supabase.from("items").delete().eq("id", itemId)

      if (deleteError) throw deleteError

      // Mark report as resolved
      const { error: updateError } = await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId)

      if (updateError) throw updateError

      await fetchReports()
      onStatsUpdate()
      alert("Item deleted and report resolved!")
    } catch (error: any) {
      console.error("Error deleting item:", error)
      alert(`Error deleting item: ${error.message}`)
    }
  }

  const getReasonBadge = (reason: string) => {
    const reasonConfig = {
      inappropriate: { color: "bg-red-100 text-red-800", label: "Inappropriate" },
      spam: { color: "bg-orange-100 text-orange-800", label: "Spam" },
      fake: { color: "bg-yellow-100 text-yellow-800", label: "Fake" },
      offensive: { color: "bg-purple-100 text-purple-800", label: "Offensive" },
      other: { color: "bg-gray-100 text-gray-800", label: "Other" },
    }
    const config = reasonConfig[reason as keyof typeof reasonConfig] || reasonConfig.other
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      reviewed: { color: "bg-blue-100 text-blue-800", label: "Reviewed" },
      resolved: { color: "bg-green-100 text-green-800", label: "Resolved" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Reported Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Filter */}
          <div className="flex gap-2 mb-6">
            {["pending", "reviewed", "resolved"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getReasonBadge(report.reason)}
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReport(report)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsReviewed(report.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Reviewed
                          </Button>
                          {report.item && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteItem(report.item!.id, report.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete Item
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Report Info */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Report Details</h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Reported by: {report.reporter_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        {report.description && (
                          <div className="flex items-start gap-1">
                            <MessageSquare className="h-3 w-3 mt-0.5" />
                            <span className="line-clamp-2">{report.description}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Info */}
                    {report.item ? (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Reported Item</h4>
                        <div className="flex gap-3">
                          {report.item.image_url && (
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <Image
                                src={report.item.image_url || "/placeholder.svg"}
                                alt={report.item.title}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm line-clamp-1">{report.item.title}</h5>
                            <p className="text-xs text-gray-600 line-clamp-2">{report.item.description}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              <span>
                                {report.item.category} • {report.item.pickup_location}
                              </span>
                              <br />
                              <span>Owner: {report.item.owner_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Reported Item</h4>
                        <p className="text-xs text-red-600">Item has been deleted</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-12">
              <Flag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {statusFilter} reports</h3>
              <p className="text-gray-600">
                {statusFilter === "pending"
                  ? "Great! No reports need your attention right now."
                  : `No ${statusFilter} reports found.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Information */}
              <div>
                <h3 className="font-medium mb-3">Report Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Reason:</span>
                    <div className="mt-1">{getReasonBadge(selectedReport.reason)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Reporter:</span>
                    <div className="mt-1">{selectedReport.reporter_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <div className="mt-1">{new Date(selectedReport.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {selectedReport.description && (
                  <div className="mt-4">
                    <span className="text-gray-600">Description:</span>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{selectedReport.description}</p>
                  </div>
                )}
              </div>

              {/* Item Information */}
              {selectedReport.item && (
                <div>
                  <h3 className="font-medium mb-3">Reported Item</h3>
                  <div className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      {selectedReport.item.image_url && (
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <Image
                            src={selectedReport.item.image_url || "/placeholder.svg"}
                            alt={selectedReport.item.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{selectedReport.item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{selectedReport.item.description}</p>
                        <div className="text-sm text-gray-500 mt-2">
                          <p>Category: {selectedReport.item.category}</p>
                          <p>Location: {selectedReport.item.pickup_location}</p>
                          <p>Owner: {selectedReport.item.owner_name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedReport.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handleMarkAsReviewed(selectedReport.id)
                      setDetailsOpen(false)
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                  {selectedReport.item && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleDeleteItem(selectedReport.item!.id, selectedReport.id)
                        setDetailsOpen(false)
                      }}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Item
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
