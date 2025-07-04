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
    return <Auth />
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">🤝</span>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700">Tigawane</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter onOpenChat={handleOpenChat} onNavigateToMyItems={handleNavigateToMyItems} />
              <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2" size="sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
        
              <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          {/* Mobile: Horizontal Navigation Menu */}
          <div className="sm:hidden mb-12">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Browse Section */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Browse</span>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      variant={currentTab === "browse-food" ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col items-center gap-1 px-3 py-3 h-auto text-xs w-full"
                      onClick={() => setCurrentTab("browse-food")}
                    >
                      <span className="text-base">🍚</span>
                      <span className="text-xs font-medium">Food</span>
                    </Button>
                    <Button
                      variant={currentTab === "browse-items" ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col items-center gap-1 px-3 py-3 h-auto text-xs w-full"
                      onClick={() => setCurrentTab("browse-items")}
                    >
                      <span className="text-base">👕</span>
                      <span className="text-xs font-medium">Items</span>
                    </Button>
                  </div>
                </div>

                {/* Share Section with Dropdown */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Share</span>
                  <div className="relative share-dropdown-container w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center gap-1 px-3 py-3 h-auto text-xs w-full"
                      onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs font-medium">Share</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${shareDropdownOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {shareDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={currentTab === "share-food" ? "default" : "ghost"}
                            size="sm"
                            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs"
                            onClick={() => {
                              setCurrentTab("share-food")
                              setShareDropdownOpen(false)
                            }}
                          >
                            <span className="text-sm">🍚</span>
                            <span className="text-xs font-medium">Food</span>
                          </Button>
                          <Button
                            variant={currentTab === "share-items" ? "default" : "ghost"}
                            size="sm"
                            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs"
                            onClick={() => {
                              setCurrentTab("share-items")
                              setShareDropdownOpen(false)
                            }}
                          >
                            <span className="text-sm">👕</span>
                            <span className="text-xs font-medium">Items</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Community Section */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Community</span>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      variant={currentTab === "collaborate" ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col items-center gap-1 px-3 py-3 h-auto text-xs w-full"
                      onClick={() => setCurrentTab("collaborate")}
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Collaborate</span>
                    </Button>
                    <Button
                      variant={currentTab === "my-items" ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col items-center gap-1 px-3 py-3 h-auto text-xs w-full"
                      onClick={() => setCurrentTab("my-items")}
                    >
                      <User className="h-4 w-4" />
                      <span className="text-xs font-medium">My Items</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Desktop: Tab bar */}
          <TabsList
            className="hidden sm:grid sm:grid-cols-6 max-w-4xl mx-auto mb-12 bg-white rounded-xl shadow-md p-2 gap-2"
          >
            <TabsTrigger 
              value="browse-food" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <span className="text-lg">🍚</span>
              <span>Food</span>
            </TabsTrigger>
            <TabsTrigger 
              value="browse-items" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <span className="text-lg">👕</span>
              <span>Items</span>
            </TabsTrigger>
            <TabsTrigger 
              value="share-food" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              <span>Share Food</span>
            </TabsTrigger>
            <TabsTrigger 
              value="share-items" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              <span>Share Items</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collaborate" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <Users className="h-4 w-4" />
              <span>Collaborate</span>
            </TabsTrigger>
            <TabsTrigger 
              value="my-items" 
              className="flex flex-col items-center gap-1 text-sm px-4 py-3 font-semibold transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
            >
              <User className="h-4 w-4" />
              <span>My Items</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse-food">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Available Food</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Find food shared by your community</p>
              </div>
              <ItemList key={`food-${refreshTrigger}`} itemType="food" onClaimItem={handleClaimItem} />
            </div>
          </TabsContent>

          <TabsContent value="browse-items">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Available Items</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">Find clothes, shoes, and household items</p>
              </div>
              <ItemList key={`items-${refreshTrigger}`} itemType="non-food" onClaimItem={handleClaimItem} />
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
