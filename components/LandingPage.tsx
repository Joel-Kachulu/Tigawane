"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, MessageCircle, MapPin, Heart, Users, Globe, Sparkles } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import SubmitStoryModal from "./SubmitStoryModal"
import { supabase } from "@/lib/supabase"
import { useLocation } from "@/contexts/LocationContext"
import { calculateDistance } from "@/lib/locationService"
// Authentic images of African people sharing and community building
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80" // African community sharing
// Slideshow images for hero background featuring African community sharing and sustainable practices
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80", // African community sharing food
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80", // Black family sharing meal
  "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80", // African women preparing food together
  "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80", // Community gathering with food
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=80", // African people sharing traditional meal
]
const HERO_IMAGE_ALT = "African people sharing food and building community together"

interface LandingPageProps {
  onGetStarted: () => void
}

const dummyStories = [
  {
    name: "Mercy",
    location: "Blantyre",
    story: "I had leftover nsima and vegetables from our family dinner. Posted on Tigawane—they were picked up within an hour by a neighbor who needed a meal!",
    color: "green"
  },
  {
    name: "Dan",
    location: "Lilongwe",
    story: "My son outgrew his school shoes. Instead of throwing them away, I shared them on Tigawane. Now they help another child walk to school every day.",
    color: "blue"
  },
  {
    name: "Grace",
    location: "Mzuzu",
    story: "We had extra sweet potatoes from our garden. Rather than let them go bad, I shared them with 3 families in our area through Tigawane.",
    color: "orange"
  },
  {
    name: "Patrick",
    location: "Zomba",
    story: "My wife packed some clothes our children had outgrown. A mother picked them up for her twins—it made her whole week!",
    color: "purple"
  }
]

interface CommunityStats {
  itemsShared: number
  communityMembers: number
  activeCollaborations: number
}

interface NearbyItem {
  id: string
  title: string
  item_type: 'food' | 'non-food'
  distance: number
  emoji: string
  category?: string
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [stories, setStories] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    itemsShared: 0,
    communityMembers: 0,
    activeCollaborations: 0
  })
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  
  const { userLocation, selectedLocation } = useLocation()

  // Fetch community stats from database
  useEffect(() => {
    async function fetchCommunityStats() {
      setStatsLoading(true)
      try {
        // Run all queries in parallel for better performance
        const [itemsResult, membersResult, collaborationsResult] = await Promise.all([
          // Get total items count (both food and non-food items)
          supabase
            .from("items")
            .select("*", { count: 'exact', head: true }),
          
          // Get total community members count
          supabase
            .from("profiles")
            .select("*", { count: 'exact', head: true }),
          
          // Get active collaborations count
          supabase
            .from("collaboration_requests")
            .select("*", { count: 'exact', head: true })
            .eq("status", "active")
        ])

        setCommunityStats({
          itemsShared: itemsResult.count || 0,
          communityMembers: membersResult.count || 0,
          activeCollaborations: collaborationsResult.count || 0
        })
      } catch (error) {
        console.error('Error fetching community stats:', error)
        // Keep default values on error
      } finally {
        setStatsLoading(false)
      }
    }
    fetchCommunityStats()
  }, [])

  // Fetch nearby items function (moved outside useEffect)
  async function fetchNearbyItems() {
    if (!selectedLocation) {
      setNearbyLoading(false)
      return
    }
    setNearbyLoading(true)
    try {
      // Create a bounding box around the user's location (approximately 10km radius)
      const kmPerDegree = 111 // Rough approximation: 1 degree ≈ 111 km
      const radiusInDegrees = 10 / kmPerDegree // 10km radius
      const minLat = selectedLocation.latitude - radiusInDegrees
      const maxLat = selectedLocation.latitude + radiusInDegrees
      const minLng = selectedLocation.longitude - radiusInDegrees
      const maxLng = selectedLocation.longitude + radiusInDegrees
      // Fetch items within bounding box for better performance
      const { data: itemsData, error } = await supabase
        .from("items")
        .select("id, title, item_type, category, pickup_lat, pickup_lon")
        .eq("status", "available")
        .not("pickup_lat", "is", null)
        .not("pickup_lon", "is", null)
        .gte("pickup_lat", minLat)
        .lte("pickup_lat", maxLat)
        .gte("pickup_lon", minLng)
        .lte("pickup_lon", maxLng)
        .limit(50) // Increased limit since we're pre-filtering with bounding box
      if (error) {
        console.error('Error fetching nearby items:', error)
        setNearbyItems([])
        return
      }
      if (!itemsData || itemsData.length === 0) {
        setNearbyItems([])
        return
      }
      // Calculate distances and sort by proximity
      const itemsWithDistance = itemsData
        .map(item => {
          const distance = calculateDistance(
            selectedLocation.latitude,
            selectedLocation.longitude,
            item.pickup_lat,
            item.pickup_lon
          )
          // Assign emoji based on category or type
          let emoji = "📦"
          if (item.item_type === "food") {
            emoji = item.category === "fruits" ? "🍎" : 
                    item.category === "vegetables" ? "🥕" : 
                    item.category === "grain" ? "🌾" : "🍽️"
          } else {
            emoji = item.category === "clothing" ? "👕" : 
                    item.category === "books" ? "📚" : 
                    item.category === "baby" ? "👶" : "📦"
          }
          return {
            id: item.id,
            title: item.title,
            item_type: item.item_type,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            emoji,
            category: item.category
          }
        })
        .filter(item => item.distance <= 5) // Only show items within 5km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5) // Show only 5 closest items
      setNearbyItems(itemsWithDistance)
    } catch (error) {
      console.error('Error fetching nearby items:', error)
      setNearbyItems([])
    } finally {
      setNearbyLoading(false)
    }
  }

  // Fetch nearby items when user location is available
  useEffect(() => {
    fetchNearbyItems()
  }, [selectedLocation])

  // Auto-refresh nearby items when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNearbyItems();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedLocation]);

  // Fetch stories (keeping existing logic)
  useEffect(() => {
    async function fetchStories() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(4)
      if (data && data.length > 0) {
        setStories(data)
      } else {
        setStories(dummyStories)
      }
    }
    fetchStories()
  }, [])

  // Hero image slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  // Initial animation trigger
  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-x-hidden relative">
      {/* Global Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
      </div>
      {/* Header */}
      <header className={`w-full bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 py-4 px-6 flex items-center justify-between sticky top-0 z-50 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <span className="text-2xl sm:text-3xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 filter drop-shadow-sm">
              🤝
            </span>
            <div className="absolute -inset-2 bg-green-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm scale-110"></div>
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700 drop-shadow-sm group-hover:text-green-800 transition-all duration-300 group-hover:scale-105">
              Tigawane
            </h1>
            <p className="text-xs text-green-600 hidden sm:block font-medium group-hover:text-green-700 transition-colors duration-300">
              Share • Connect • Care
            </p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">How It Works</a>
          <a href="#what-to-share" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">What to Share</a>
          <a href="#stories" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">Stories</a>
          <Button 
            onClick={onGetStarted}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
          >
            Get Started
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button 
            onClick={onGetStarted}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
          >
            Start Sharing
          </Button>
        </div>
      </header>
      {/* Hero Section */}
      <section ref={heroRef} className="relative bg-gradient-to-r from-green-600 to-blue-500 text-white min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {HERO_IMAGES.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ${
                index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
              }`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 to-blue-500/80" />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute top-40 right-20 w-16 h-16 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <div className="absolute bottom-40 left-20 w-12 h-12 bg-white/15 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }} />
          <Heart className="absolute top-32 right-32 w-8 h-8 text-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Users className="absolute bottom-32 right-16 w-6 h-6 text-white/40 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <Globe className="absolute top-60 left-32 w-7 h-7 text-white/25 animate-pulse" style={{ animationDelay: '2.5s' }} />
        </div>

        <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center text-center space-y-10 relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 drop-shadow-lg animate-fade-in-up leading-tight" style={{ animationDelay: '0.2s' }}>
              <span className="block text-yellow-300">Tigawane</span>
              Community Sharing
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto text-white/90 mb-10 drop-shadow animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.4s' }}>
              Connect with your neighbors to share food, items, and experiences. 
              <span className="block mt-2 text-green-200 font-semibold">Build stronger communities through generous sharing.</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 group min-w-[240px]"
            >
              <span className="mr-3 text-2xl">🍽️</span>
              Browse Nearby Food
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600 font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm min-w-[240px]"
            >
              <ArrowRight className="mr-3 h-6 w-6" />
              Share an Item
            </Button>
          </div>

          {/* Community Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-yellow-300 mb-2 drop-shadow-lg">
                {statsLoading ? '...' : `${communityStats.itemsShared}+`}
              </div>
              <div className="text-sm text-white/90 font-medium">Items Shared</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-green-300 mb-2 drop-shadow-lg">
                {statsLoading ? '...' : `${communityStats.communityMembers}+`}
              </div>
              <div className="text-sm text-white/90 font-medium">Community Members</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-blue-300 mb-2 drop-shadow-lg">
                {statsLoading ? '...' : communityStats.activeCollaborations}
              </div>
              <div className="text-sm text-white/90 font-medium">Active Collaborations</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Featured Sections - Near You & Trending */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Near You Section */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl">📍</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Near You</h2>
                  <p className="text-gray-600 text-lg">Fresh items within walking distance</p>
                </div>
              </div>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 px-6 py-3 font-semibold"
              >
                View All
              </Button>
            </div>
            
            {/* Horizontal Scroll Cards */}
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {nearbyLoading ? (
                // Loading state
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 animate-pulse"
                  >
                    <div className="w-10 h-10 bg-gray-300 rounded mb-4"></div>
                    <div className="h-6 bg-gray-300 rounded mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                      <div className="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                  </div>
                ))
              ) : nearbyItems.length > 0 ? (
                // Real nearby items
                nearbyItems.map((item) => (
                  <button
                    key={item.id}
                    className="flex-shrink-0 w-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onGetStarted}
                  >
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">{item.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">{item.distance}km away</span>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.item_type === 'food' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {item.item_type === 'food' ? 'Food' : 'Items'}
                      </div>
                    </div>
                  </button>
                ))
              ) : !selectedLocation ? (
                // No location selected
                <div className="flex-shrink-0 w-full text-center p-8">
                  <div className="text-gray-500 mb-4">
                    <MapPin className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Enable location to see nearby items</p>
                    <p className="text-sm">Allow location access to discover items in your area</p>
                  </div>
                </div>
              ) : (
                // No nearby items found
                <div className="flex-shrink-0 w-full text-center p-8">
                  <div className="text-gray-500 mb-4">
                    <Heart className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">No items nearby yet</p>
                    <p className="text-sm">Be the first to share something in your area!</p>
                  </div>
                  <Button
                    onClick={onGetStarted}
                    className="bg-green-600 hover:bg-green-700 text-white mt-4"
                  >
                    Share Something
                  </Button>
                </div>
              )}
            </div>
          </div>


          {/* Trending Section */}
          {/*
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl">🔥</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Trending</h2>
                  <p className="text-gray-600 text-lg">Popular items in your community</p>
                </div>
              </div>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50 px-6 py-3 font-semibold"
              >
                Join Community
              </Button>
            </div>
            
            // Horizontal Scroll Cards
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {[
                { emoji: "🍕", title: "Community Pizza Night", users: "12", type: "Collaboration", color: "purple" },
                { emoji: "🧸", title: "Kids Toy Exchange", users: "8", type: "Items", color: "pink" },
                { emoji: "🌿", title: "Garden Share", users: "15", type: "Food", color: "green" },
                { emoji: "📖", title: "Book Club Swap", users: "6", type: "Items", color: "blue" },
                { emoji: "🥘", title: "Recipe Exchange", users: "20", type: "Food", color: "orange" }
              ].map((item, index) => (
                <button
                  key={index}
                  className="flex-shrink-0 w-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-green-500"
                  onClick={onGetStarted}
                >
                  <div className="text-4xl mb-4">{item.emoji}</div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">{item.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">{item.users} members</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                      item.color === 'pink' ? 'bg-pink-100 text-pink-700' :
                      item.color === 'green' ? 'bg-green-100 text-green-700' :
                      item.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {item.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div> */}
        </div>
      </section> 

      {/* How It Works Section */}
      <section id="how-it-works" ref={(el) => { sectionRefs.current[0] = el as HTMLElement }} className="py-20 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Simple Process
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">Three simple steps to start sharing and building community</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Post what you want to give",
                description: "Food, clothes, shoes, utensils, baby items—you name it. Just snap a pic, write a short description, and share.",
                icon: "📱",
                delay: "0.1s"
              },
              {
                step: "2", 
                title: "Others in your area see the item",
                description: "Neighbors can comment, message, or request to pick it up.",
                icon: "👥",
                delay: "0.2s"
              },
              {
                step: "3",
                title: "Meet up and share", 
                description: "Once they collect it, it's done. No money. Just community.",
                icon: "🤝",
                delay: "0.3s"
              }
            ].map((item, index) => (
              <Card 
                key={index}
                className="text-center border-2 hover:border-green-300 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group opacity-0 animate-fade-in-up"
                style={{ animationDelay: item.delay }}
              >
              <CardHeader>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300 relative">
                    <span className="text-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors duration-300">
                      {item.step}
                    </span>
                    <div className="absolute -top-2 -right-2 text-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                      {item.icon}
                    </div>
                </div>
                  <CardTitle className="text-xl group-hover:text-green-700 transition-colors duration-300">
                    {item.title}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {item.description}
                </p>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What You Can Share Section */}
      <section id="what-to-share" ref={(el) => { sectionRefs.current[1] = el as HTMLElement }} className="py-20 bg-green-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-orange-200/20 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-200/20 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-200/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              What to Share
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">What You Can Share on Tigawane</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">From food to clothes, every item can find a new home</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                icon: "🍚",
                title: "Food",
                color: "orange",
                items: [
                  "Leftover cooked food (safe to eat)",
                  "Near-expiry groceries", 
                  "Garden produce",
                  "Extra flour, rice, sugar, etc."
                ],
                delay: "0.1s",
                backgroundImage: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=400&q=80" // African woman with fresh produce
              },
              {
                icon: "👕",
                title: "Non-Food Items", 
                color: "blue",
                items: [
                  "Clothes & shoes in good condition",
                  "Kids' school uniforms",
                  "Blankets & household goods", 
                  "Baby supplies (bottles, wipes, etc.)"
                ],
                delay: "0.2s",
                backgroundImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80" // People organizing clothes for sharing
              }
            ].map((category, index) => (
              <Card 
                key={index}
                className={`border-2 border-${category.color}-200 hover:border-${category.color}-400 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group opacity-0 animate-fade-in-up relative overflow-hidden`}
                style={{ animationDelay: category.delay }}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-5 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ backgroundImage: `url(${category.backgroundImage})` }}
                />
                <div className="relative z-10">
              <CardHeader>
                    <div className="flex items-center gap-3 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-3xl group-hover:animate-bounce">{category.icon}</span>
                      <CardTitle className={`text-2xl text-${category.color}-700 group-hover:text-${category.color}-800 transition-colors duration-300`}>
                        {category.title}
                      </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div 
                        key={itemIndex}
                        className="flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-300"
                        style={{ transitionDelay: `${itemIndex * 0.1}s` }}
                      >
                        <span className={`text-${category.color}-500 group-hover:scale-125 transition-transform duration-300`}>•</span>
                        <span className="group-hover:text-gray-800 transition-colors duration-300">{item}</span>
                </div>
                    ))}
                  </CardContent>
                </div>
            </Card>
            ))}
                </div>
                </div>
      </section>

      {/* From Waste to Share Section */}
      <section ref={(el) => { sectionRefs.current[2] = el as HTMLElement }} className="py-20 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Transformation
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">From Waste to Share</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">See how simple it is to turn potential waste into community blessings</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Before: Ready to Throw Away",
                description: "Instead of throwing away good items, take a moment to consider who might need them.",
                image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80",
                icon: "🗑️",
                color: "red"
              },
              {
                title: "Pack with Care",
                description: "Clean and pack items with love, knowing they'll bring joy to someone else.",
                image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80",
                icon: "📦",
                color: "yellow"
              },
              {
                title: "Share the Blessing",
                description: "Share on Tigawane and connect with neighbors who need what you have.",
                image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=400&q=80",
                icon: "🤝",
                color: "green"
              }
            ].map((step, index) => (
              <Card 
                key={index}
                className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-in-up relative overflow-hidden"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Background Image */}
                <div 
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${step.image})` }}
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
                  <div className="absolute top-4 right-4 text-3xl bg-white rounded-full p-2 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className={`text-xl font-bold text-${step.color}-700 mb-3 group-hover:text-${step.color}-800 transition-colors duration-300`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {step.description}
                  </p>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="stories" ref={(el) => { sectionRefs.current[3] = el as HTMLElement }} className="py-20 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              Success Stories
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Real Stories</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">See how Tigawane is changing lives across Malawi</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((s, i) => (
              <Card 
                key={i} 
                className={`border-l-4 border-l-${s.color || (i % 2 === 0 ? "green" : "blue")}-500 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group opacity-0 animate-fade-in-up`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-${s.color || (i % 2 === 0 ? "green" : "blue")}-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-${s.color || (i % 2 === 0 ? "green" : "blue")}-200 transition-all duration-300 relative`}>
                      <span className={`text-${s.color || (i % 2 === 0 ? "green" : "blue")}-600 font-bold group-hover:text-${s.color || (i % 2 === 0 ? "green" : "blue")}-700 transition-colors duration-300`}>
                        {s.name[0]}
                      </span>
                      <Heart className="absolute -top-1 -right-1 w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <blockquote className="text-lg italic text-gray-700 mb-3 group-hover:text-gray-800 transition-colors duration-300">
                        "{s.story}"
                      </blockquote>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold group-hover:text-gray-800 transition-colors duration-300">{s.name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 flex items-center gap-1 group-hover:text-gray-600 transition-colors duration-300">
                          <MapPin className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                          {s.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <p className="text-lg text-gray-600 mb-4">Want to be featured? Share your Tigawane moment!</p>
            <Button
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50 hover:scale-105 hover:shadow-lg transition-all duration-300 group"
              onClick={() => setModalOpen(true)}
            >
              <MessageCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              Submit your story
            </Button>
            <SubmitStoryModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSuccess={() => {
                // Optionally refetch stories after submission
              }}
            />
          </div>
        </div>
      </section>

      {/* Why Tigawane Exists Section */}
      <section ref={(el) => { sectionRefs.current[4] = el as HTMLElement }} className="py-20 bg-gray-900 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-green-900/20 to-blue-900/20"></div>
          <div className="absolute top-20 left-20 w-40 h-40 bg-green-400/10 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-400/10 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-12 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Our Mission
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">Why Tigawane Exists</h2>
          </div>
          <div className="space-y-6 text-lg">
            <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Malawi loses tons of edible food every day—while thousands go hungry.
            </p>
            <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              Families throw away clothes, utensils, and goods that others desperately need.
            </p>
            <p className="text-2xl font-bold text-green-400 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              Tigawane changes that.
            </p>
            <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              We connect neighbors through generosity and dignity.
            </p>
            <blockquote className="text-xl italic text-green-300 border-l-4 border-green-400 pl-6 my-8 opacity-0 animate-fade-in-up hover:scale-105 transition-transform duration-300" style={{ animationDelay: '1s' }}>
              "Let's share" is not just our name. It's our movement.
            </blockquote>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={(el) => { sectionRefs.current[5] = el as HTMLElement }} className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-600/90 to-blue-600/90"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-12 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              Join Today
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Ready to Share or Receive?</h2>
            <p className="text-xl md:text-2xl mb-8 leading-relaxed" style={{ animationDelay: '0.2s' }}>
              Join other Malawians creating a culture of generosity.
              <br />
              <span className="text-yellow-300 font-semibold">List your first item in seconds—food or non-food.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 group"
            >
              Share Something Today 
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600 font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
            >
              See What's Being Shared
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={(el) => { sectionRefs.current[6] = el as HTMLElement }} className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-900/10 to-blue-900/10"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-green-500/5 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-500/5 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Footer Content */}
          <div className="py-16">
            <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 gap-8">
              {/* Brand Section */}
              <div className="lg:col-span-2 opacity-0 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6 group cursor-pointer">
                  <div className="relative">
                    <span className="text-3xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">🤝</span>
                    <div className="absolute -inset-2 bg-green-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm"></div>
                  </div>
            <div>
                    <h2 className="text-2xl font-bold group-hover:text-green-400 transition-colors duration-300">Tigawane</h2>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Share • Connect • Care</p>
                  </div>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed mb-6 max-w-md">
                  Connecting Malawians through generosity and community sharing. 
                  Together, we're building a sustainable future where nothing goes to waste.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live in Malawi</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Community Driven</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
                <div className="space-y-3">
                  <a href="#" className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">How It Works</span>
                  </a>
                  <a href="#" className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Share Items</span>
                  </a>
                  <a href="#" className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Find Items</span>
                  </a>
                  <a href="#" className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group">
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Success Stories</span>
                  </a>
            </div>
              </div>

              {/* Contact Info */}
              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-lg font-semibold mb-6 text-white">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors duration-300">
                      <span className="text-green-400"></span>
                    </div>
                    <div>
                      <p className="text-gray-300 group-hover:text-white transition-colors duration-300">WhatsApp</p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">+265 986 445 261</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                      <span className="text-blue-400"></span>
                    </div>
                    <div>
                      <p className="text-gray-300 group-hover:text-white transition-colors duration-300">Email</p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">tigawane@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400"></span>
            </div>
            <div>
                      <p className="text-gray-300">Location</p>
                      <p className="text-sm text-gray-400">Malawi, Africa</p>
                    </div>
                  </div>
              </div>  
            </div>

              {/* Community & Social */}
              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <h3 className="text-lg font-semibold mb-6 text-white">Join Our Community</h3>
                <div className="space-y-4">
                  <a 
                    href="https://www.facebook.com/tigawane" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center group-hover:bg-blue-600/30 transition-colors duration-300">
                      <span className="text-blue-400">💬</span>
                    </div>
            <div>
                      <p className="text-gray-300 group-hover:text-white transition-colors duration-300">Facebook</p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Follow @Tigawane</p>
                    </div>
                  </a>
                  <div className="pt-4">
                    <p className="text-sm text-gray-400 mb-3">Download our app</p>
                    <div className="flex gap-2">
                      <div className="w-24 h-8 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-300">
                        Coming Soon
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700/50 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <p className="text-gray-400">
                  &copy; 2025 Tigawane. Built with <span className="text-red-400">❤️</span> for the people of Malawi.
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <a href="#" className="hover:text-green-400 transition-colors duration-300">Privacy Policy</a>
                <a href="#" className="hover:text-green-400 transition-colors duration-300">Terms of Service</a>
                <a href="#" className="hover:text-green-400 transition-colors duration-300">Help Center</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
