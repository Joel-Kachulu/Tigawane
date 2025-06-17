"use client"

import { useState } from "react"
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
import { LogOut, Plus, Home, Users, User } from "lucide-react"
import MyItemsManager from "@/components/MyItemsManager"

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
  const { user, loading, signOut } = useAuth()
  const [showLanding, setShowLanding] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showCollaborationChat, setShowCollaborationChat] = useState(false)
  const [chatClaimId, setChatClaimId] = useState<string | null>(null)
  const [chatOtherUser, setChatOtherUser] = useState("")
  const [collaborationChatId, setCollaborationChatId] = useState<string | null>(null)
  const [collaborationChatTitle, setCollaborationChatTitle] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [myItemsRefreshTrigger, setMyItemsRefreshTrigger] = useState(0)

  const handleGetStarted = () => {
    setShowLanding(false)
  }

  const handleGoHome = () => {
    setShowLanding(true)
  }

  const handleSignOut = async () => {
    try {
      console.log("Sign out button clicked")
      await signOut()
      setShowLanding(true)
    } catch (error) {
      console.error("Error in handleSignOut:", error)
    }
  }

  const handleClaimItem = (item: Item) => {
    setSelectedItem(item)
    setShowClaimModal(true)
  }

  const handleItemAdded = () => {
    setRefreshTrigger((prev) => prev + 1)
    setMyItemsRefreshTrigger((prev) => prev + 1)
  }

  const handleItemClaimed = () => {
    setRefreshTrigger((prev) => prev + 1)
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
    setRefreshTrigger((prev) => prev + 1)
    setMyItemsRefreshTrigger((prev) => prev + 1)
  }

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
              <span className="text-2xl">🤝</span>
              <h1 className="text-xl font-bold text-green-700">Tigawane</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter onOpenChat={handleOpenChat} />
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
        <Tabs defaultValue="browse-food" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl mx-auto mb-8">
            <TabsTrigger value="browse-food" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <span className="text-lg">🍚</span>
              <span>Food</span>
            </TabsTrigger>
            <TabsTrigger value="browse-items" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <span className="text-lg">👕</span>
              <span>Items</span>
            </TabsTrigger>
            <TabsTrigger value="share-food" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <Plus className="h-4 w-4" />
              <span>Share Food</span>
            </TabsTrigger>
            <TabsTrigger value="share-items" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <Plus className="h-4 w-4" />
              <span>Share Items</span>
            </TabsTrigger>
            <TabsTrigger value="collaborate" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <Users className="h-4 w-4" />
              <span>Collaborate</span>
            </TabsTrigger>
            <TabsTrigger value="my-items" className="flex flex-col items-center gap-1 text-xs sm:text-sm p-2">
              <User className="h-4 w-4" />
              <span>My Items</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse-food">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Food</h2>
                <p className="text-gray-600">Find food shared by your community</p>
              </div>
              <ItemList key={`food-${refreshTrigger}`} itemType="food" onClaimItem={handleClaimItem} />
            </div>
          </TabsContent>

          <TabsContent value="browse-items">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Items</h2>
                <p className="text-gray-600">Find clothes, shoes, and household items</p>
              </div>
              <ItemList key={`items-${refreshTrigger}`} itemType="non-food" onClaimItem={handleClaimItem} />
            </div>
          </TabsContent>

          <TabsContent value="share-food">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Food</h2>
                <p className="text-gray-600">Help reduce waste by sharing surplus food</p>
              </div>
              <AddItem itemType="food" onItemAdded={handleItemAdded} />
            </div>
          </TabsContent>

          <TabsContent value="share-items">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Items</h2>
                <p className="text-gray-600">Give away clothes, shoes, and household items</p>
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
