"use client"

import { useState, useEffect } from "react"
import { useAuth, AuthProvider } from "@/contexts/AuthContext"
import Auth from "@/components/Auth"
import LandingPage from "@/components/LandingPage"
import ItemList from "@/components/ItemList"
import AddItem from "@/components/AddItem"
import ClaimFoodModal from "@/components/ClaimFoodModal"
import ChatModal from "@/components/ChatModal"
import CollaborationChatModal from "@/components/CollaborationChatModal"
import NotificationCenter from "@/components/NotificationCenter"
import CollaborationCenter from "@/components/CollaborationCenter"
import LocationSelector from "@/components/LocationSelector"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Plus, Home, Users, User, Menu, ChevronDown } from "lucide-react"
import MyItemsManager from "@/components/MyItemsManager"
import Link from "next/link"

interface Item {
  id: string
  title: string
  description: string | null
  category: string
  item_type: "food" | "non-food"
  quantity: string
  condition?: string | null
  expiry_date: string | null
  pickup_location: string
  image_url: string | null
  status: string
  created_at: string
  user_id: string
  owner_name?: string | null
}

function AppContent() {
  const { user, signOut } = useAuth()
  const [currentTab, setCurrentTab] = useState("browse-food")
  const [showLanding, setShowLanding] = useState(true)
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatClaimId, setChatClaimId] = useState("")
  const [chatOtherUser, setChatOtherUser] = useState("")
  const [showCollaborationChat, setShowCollaborationChat] = useState(false)
  const [collaborationChatId, setCollaborationChatId] = useState("")
  const [collaborationChatTitle, setCollaborationChatTitle] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [myItemsRefreshTrigger, setMyItemsRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleGetStarted = () => setShowLanding(false)
  const handleGoHome = () => setShowLanding(true)

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowLanding(true)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleClaimItem = (item: Item) => {
    setSelectedItem(item)
    setShowClaimModal(true)
  }

  const handleItemAdded = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleItemClaimed = () => {
    setRefreshTrigger((prev) => prev + 1)
    setMyItemsRefreshTrigger((prev) => prev + 1)
  }

  const handleOpenChat = (claimId: string, otherUserName: string) => {
    setChatClaimId(claimId)
    setChatOtherUser(otherUserName)
    setShowChatModal(true)
  }

  const handleOpenCollaborationChat = (collaborationId: string, title: string) => {
    setCollaborationChatId(collaborationId)
    setCollaborationChatTitle(title)
    setShowCollaborationChat(true)
  }

  const handleMyItemUpdated = () => {
    setMyItemsRefreshTrigger((prev) => prev + 1)
  }

  const handleNavigateToMyItems = () => {
    setCurrentTab("my-items")
  }

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.share-dropdown-container')) {
        setShareDropdownOpen(false)
      }
    }

    if (shareDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [shareDropdownOpen])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={handleGetStarted} />
    }
    return <Auth onBackToLanding={() => setShowLanding(true)} />
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 shadow-lg border-b border-green-400/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section with Animation */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={handleGoHome}>
              <div className="relative">
                <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm">
                  🤝
                </span>
                <div className="absolute -inset-2 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white drop-shadow-sm group-hover:text-green-50 transition-colors duration-300">
                  Tigawane
                </h1>
                <p className="text-xs text-green-100 hidden sm:block font-medium">
                  Share • Connect • Care
                </p>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Welcome Message */}
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs text-green-100 font-medium">Welcome back</span>
                <span className="text-sm text-white font-semibold truncate max-w-32">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </div>

              {/* Notification Center with Enhanced Styling */}
              <div className="relative">
                <NotificationCenter onOpenChat={handleOpenChat} onNavigateToMyItems={handleNavigateToMyItems} />
              </div>

              {/* Home Button */}
              <Button 
                variant="outline" 
                onClick={handleGoHome} 
                className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 hover:text-green-50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105" 
                size="sm"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Home</span>
              </Button>

              {/* Sign Out Button */}
              <Button 
                variant="outline" 
                onClick={handleSignOut} 
                className="flex items-center gap-2 bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30 hover:border-red-300/50 hover:text-red-50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105" 
                size="sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Subtle Bottom Glow Effect */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          {/* Mobile: Enhanced Navigation Menu */}
          <div className="sm:hidden mb-12">
            <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 rounded-2xl shadow-xl border border-green-100/50 p-6 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-6">
                {/* Browse Section */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Browse</span>
                    <div className="w-6 h-0.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"></div>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <Button
                      variant={currentTab === "browse-food" ? "default" : "outline"}
                      size="sm"
                      className={`group relative flex flex-col items-center gap-2 px-4 py-4 h-auto text-xs w-full rounded-xl transition-all duration-300 overflow-hidden ${
                        currentTab === "browse-food" 
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transform scale-105 border-blue-500" 
                          : "bg-white/80 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:scale-102 border-blue-200"
                      }`}
                      onClick={() => setCurrentTab("browse-food")}
                    >
                      {currentTab === "browse-food" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 animate-pulse"></div>
                      )}
                      <span className="text-lg transform group-hover:scale-110 transition-transform duration-300 relative z-10">🍚</span>
                      <span className="text-xs font-semibold relative z-10">Food</span>
                    </Button>
                    <Button
                      variant={currentTab === "browse-items" ? "default" : "outline"}
                      size="sm"
                      className={`group relative flex flex-col items-center gap-2 px-4 py-4 h-auto text-xs w-full rounded-xl transition-all duration-300 overflow-hidden ${
                        currentTab === "browse-items" 
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transform scale-105 border-blue-500" 
                          : "bg-white/80 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:scale-102 border-blue-200"
                      }`}
                      onClick={() => setCurrentTab("browse-items")}
                    >
                      {currentTab === "browse-items" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 animate-pulse"></div>
                      )}
                      <span className="text-lg transform group-hover:scale-110 transition-transform duration-300 relative z-10">👕</span>
                      <span className="text-xs font-semibold relative z-10">Items</span>
                    </Button>
                  </div>
                </div>

                {/* Share Section with Enhanced Dropdown */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Share</span>
                    <div className="w-6 h-0.5 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"></div>
                  </div>
                  <div className="relative share-dropdown-container w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`group relative flex items-center justify-center gap-2 px-4 py-4 h-auto text-xs w-full rounded-xl transition-all duration-300 overflow-hidden ${
                        shareDropdownOpen || currentTab.startsWith('share-')
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg border-orange-500 transform scale-105" 
                          : "bg-white/80 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md hover:scale-102 border-orange-200"
                      }`}
                      onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                    >
                      {(shareDropdownOpen || currentTab.startsWith('share-')) && (
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 animate-pulse"></div>
                      )}
                      <Plus className={`h-4 w-4 transform group-hover:rotate-90 transition-all duration-300 relative z-10 ${shareDropdownOpen ? 'rotate-45' : ''}`} />
                      <span className="text-xs font-semibold relative z-10">Share</span>
                      <ChevronDown className={`h-4 w-4 transition-all duration-300 relative z-10 ${shareDropdownOpen ? 'rotate-180 scale-110' : 'group-hover:scale-110'}`} />
                    </Button>

                    {shareDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-orange-200/50 p-3 z-50 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={currentTab === "share-food" ? "default" : "ghost"}
                            size="sm"
                            className={`group flex items-center justify-center gap-3 w-full px-4 py-3 text-xs rounded-lg transition-all duration-300 ${
                              currentTab === "share-food" 
                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md" 
                                : "hover:bg-orange-100 hover:shadow-sm hover:scale-105"
                            }`}
                            onClick={() => {
                              setCurrentTab("share-food")
                              setShareDropdownOpen(false)
                            }}
                          >
                            <span className="text-base transform group-hover:scale-110 transition-transform duration-200">🍚</span>
                            <span className="text-xs font-semibold">Share Food</span>
                          </Button>
                          <Button
                            variant={currentTab === "share-items" ? "default" : "ghost"}
                            size="sm"
                            className={`group flex items-center justify-center gap-3 w-full px-4 py-3 text-xs rounded-lg transition-all duration-300 ${
                              currentTab === "share-items" 
                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md" 
                                : "hover:bg-orange-100 hover:shadow-sm hover:scale-105"
                            }`}
                            onClick={() => {
                              setCurrentTab("share-items")
                              setShareDropdownOpen(false)
                            }}
                          >
                            <span className="text-base transform group-hover:scale-110 transition-transform duration-200">👕</span>
                            <span className="text-xs font-semibold">Share Items</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Community Section */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Community</span>
                    <div className="w-6 h-0.5 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"></div>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <Button
                      variant={currentTab === "collaborate" ? "default" : "outline"}
                      size="sm"
                      className={`group relative flex flex-col items-center gap-2 px-4 py-4 h-auto text-xs w-full rounded-xl transition-all duration-300 overflow-hidden ${
                        currentTab === "collaborate" 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transform scale-105 border-purple-500" 
                          : "bg-white/80 hover:bg-purple-50 hover:border-purple-300 hover:shadow-md hover:scale-102 border-purple-200"
                      }`}
                      onClick={() => setCurrentTab("collaborate")}
                    >
                      {currentTab === "collaborate" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-600/20 animate-pulse"></div>
                      )}
                      <Users className="h-4 w-4 transform group-hover:scale-110 transition-transform duration-300 relative z-10" />
                      <span className="text-xs font-semibold relative z-10">Collaborate</span>
                    </Button>
                    <Button
                      variant={currentTab === "my-items" ? "default" : "outline"}
                      size="sm"
                      className={`group relative flex flex-col items-center gap-2 px-4 py-4 h-auto text-xs w-full rounded-xl transition-all duration-300 overflow-hidden ${
                        currentTab === "my-items" 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transform scale-105 border-purple-500" 
                          : "bg-white/80 hover:bg-purple-50 hover:border-purple-300 hover:shadow-md hover:scale-102 border-purple-200"
                      }`}
                      onClick={() => setCurrentTab("my-items")}
                    >
                      {currentTab === "my-items" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-600/20 animate-pulse"></div>
                      )}
                      <User className="h-4 w-4 transform group-hover:scale-110 transition-transform duration-300 relative z-10" />
                      <span className="text-xs font-semibold relative z-10">My Items</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Enhanced Tab Navigation */}
          <div className="hidden sm:block mb-12">
            <div className="max-w-6xl mx-auto">
              {/* Main Navigation Cards */}
              <div className="grid grid-cols-6 gap-4 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 rounded-2xl shadow-xl border border-green-100/50 p-6 backdrop-blur-sm">
                {/* Browse Food Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "browse-food" 
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transform scale-105 border border-blue-500" 
                      : "bg-white/70 hover:bg-blue-50 hover:shadow-lg hover:scale-102 border border-blue-200/50"
                  }`}
                  onClick={() => setCurrentTab("browse-food")}
                >
                  {currentTab === "browse-food" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300 relative z-10">🍚</span>
                  <span className="text-sm font-bold relative z-10 text-center">Browse Food</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "browse-food" ? "bg-white/50" : "bg-blue-300 group-hover:bg-blue-400"
                  }`}></div>
                </div>

                {/* Browse Items Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "browse-items" 
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transform scale-105 border border-blue-500" 
                      : "bg-white/70 hover:bg-blue-50 hover:shadow-lg hover:scale-102 border border-blue-200/50"
                  }`}
                  onClick={() => setCurrentTab("browse-items")}
                >
                  {currentTab === "browse-items" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300 relative z-10">👕</span>
                  <span className="text-sm font-bold relative z-10 text-center">Browse Items</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "browse-items" ? "bg-white/50" : "bg-blue-300 group-hover:bg-blue-400"
                  }`}></div>
                </div>

                {/* Share Food Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "share-food" 
                      ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg transform scale-105 border border-orange-500" 
                      : "bg-white/70 hover:bg-orange-50 hover:shadow-lg hover:scale-102 border border-orange-200/50"
                  }`}
                  onClick={() => setCurrentTab("share-food")}
                >
                  {currentTab === "share-food" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <div className="relative z-10">
                    <Plus className="h-6 w-6 transform group-hover:rotate-90 transition-all duration-300" />
                  </div>
                  <span className="text-sm font-bold relative z-10 text-center">Share Food</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "share-food" ? "bg-white/50" : "bg-orange-300 group-hover:bg-orange-400"
                  }`}></div>
                </div>

                {/* Share Items Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "share-items" 
                      ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg transform scale-105 border border-orange-500" 
                      : "bg-white/70 hover:bg-orange-50 hover:shadow-lg hover:scale-102 border border-orange-200/50"
                  }`}
                  onClick={() => setCurrentTab("share-items")}
                >
                  {currentTab === "share-items" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <div className="relative z-10">
                    <Plus className="h-6 w-6 transform group-hover:rotate-90 transition-all duration-300" />
                  </div>
                  <span className="text-sm font-bold relative z-10 text-center">Share Items</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "share-items" ? "bg-white/50" : "bg-orange-300 group-hover:bg-orange-400"
                  }`}></div>
                </div>

                {/* Collaborate Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "collaborate" 
                      ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transform scale-105 border border-purple-500" 
                      : "bg-white/70 hover:bg-purple-50 hover:shadow-lg hover:scale-102 border border-purple-200/50"
                  }`}
                  onClick={() => setCurrentTab("collaborate")}
                >
                  {currentTab === "collaborate" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <Users className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300 relative z-10" />
                  <span className="text-sm font-bold relative z-10 text-center">Collaborate</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "collaborate" ? "bg-white/50" : "bg-purple-300 group-hover:bg-purple-400"
                  }`}></div>
                </div>

                {/* My Items Tab */}
                <div 
                  className={`group relative flex flex-col items-center gap-3 px-6 py-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                    currentTab === "my-items" 
                      ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transform scale-105 border border-purple-500" 
                      : "bg-white/70 hover:bg-purple-50 hover:shadow-lg hover:scale-102 border border-purple-200/50"
                  }`}
                  onClick={() => setCurrentTab("my-items")}
                >
                  {currentTab === "my-items" && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-600/20 animate-pulse"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                    </>
                  )}
                  <User className="h-6 w-6 transform group-hover:scale-110 transition-transform duration-300 relative z-10" />
                  <span className="text-sm font-bold relative z-10 text-center">My Items</span>
                  <div className={`h-1 w-12 rounded-full transition-all duration-300 ${
                    currentTab === "my-items" ? "bg-white/50" : "bg-purple-300 group-hover:bg-purple-400"
                  }`}></div>
                </div>
              </div>

              {/* Active Tab Indicator */}
              <div className="flex justify-center mt-4">
                <div className="flex gap-2">
                  {["browse-food", "browse-items", "share-food", "share-items", "collaborate", "my-items"].map((tab) => (
                    <div
                      key={tab}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentTab === tab ? "w-8 bg-green-500" : "w-2 bg-gray-300"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <TabsContent value="browse-food">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Find food shared by your community</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                <div className="lg:col-span-1 order-2 lg:order-1">
                  <LocationSelector />
                </div>
                <div className="lg:col-span-4 order-1 lg:order-2">
                  <ItemList key={`food-${refreshTrigger}`} itemType="food" collaborationId={null} onClaimItem={handleClaimItem} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="browse-items">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Find clothes, shoes, and household items</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                <div className="lg:col-span-1 order-2 lg:order-1">
                  <LocationSelector />
                </div>
                <div className="lg:col-span-4 order-1 lg:order-2">
                  <ItemList key={`items-${refreshTrigger}`} itemType="non-food" collaborationId={null} onClaimItem={handleClaimItem} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="share-food">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Share Food</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Help reduce waste by sharing surplus food</p>
              </div>
              <AddItem itemType="food" onItemAdded={handleItemAdded} />
            </div>
          </TabsContent>

          <TabsContent value="share-items">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Share Items</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Give away clothes, shoes, and household items</p>
              </div>
              <AddItem itemType="non-food" onItemAdded={handleItemAdded} />
            </div>
          </TabsContent>

          <TabsContent value="collaborate">
            <CollaborationCenter onOpenCollaborationChat={handleOpenCollaborationChat} />
          </TabsContent>

          <TabsContent value="my-items">
            <MyItemsManager key={`my-items-${myItemsRefreshTrigger}`} onItemUpdated={handleMyItemUpdated} />
          </TabsContent>
        </Tabs>
      </main>

      <ClaimFoodModal
        foodItem={selectedItem}
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={handleItemClaimed}
      />

      <ChatModal
        claimId={chatClaimId}
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        otherUserName={chatOtherUser}
      />

      <CollaborationChatModal
        collaborationId={collaborationChatId}
        collaborationTitle={collaborationChatTitle}
        isOpen={showCollaborationChat}
        onClose={() => setShowCollaborationChat(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}