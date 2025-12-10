"use client"
// ...existing imports...


import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, MessageCircle, MapPin, Heart, Users, Globe, Sparkles } from "lucide-react"
import { useEffect, useState, useRef, useCallback } from "react"
import Image from 'next/image'
import SubmitStoryModal from "./SubmitStoryModal"
import { supabase } from "@/lib/supabase"
import { useLocation } from "@/contexts/LocationContext"
import { calculateDistance } from "@/lib/locationService"
import { fetchCommunityStats, fetchStories, fetchProfiles } from "@/lib/dataFetching"
import { nearbyItemsCache, generateCacheKey, CACHE_TTL } from "@/lib/cache"
// Authentic images of African people sharing and community building
const HERO_IMAGE_URL = "/images/hero1.jpg" // local fallback hero image
// Slideshow images for hero background (use files in public/images)
const HERO_IMAGES = [
  "/images/people sharing.avif",
  "/images/tig5.webp",
  "/images/girlD.png",
  "/images/tigawaneD.png",
  "/images/ready.avif",
  "/images/food1.jpg"
]
const HERO_IMAGE_ALT = "African people sharing food and building community together"

// Normalize external links (e.g., Unsplash page URLs) to direct image URLs usable in CSS/background-image.
function normalizeImageUrl(url: string) {
  if (!url) return url
  try {
    const u = new URL(url)
    // Handle unsplash page links like https://unsplash.com/photos/<slug>-<id>
    if (u.hostname.includes('unsplash.com') && u.pathname.startsWith('/photos/')) {
      // split path into segments and pick the last meaningful segment
      const parts = u.pathname.split('/').filter(Boolean)
      const last = parts[parts.length - 1] || ''
      // Unsplash page slugs often contain hyphen-separated slug and id (e.g. 'photo-slug-abc123')
      const id = last.split('-').pop()
      if (id) {
        // Use source.unsplash which redirects to the actual image
        return `https://source.unsplash.com/${id}/1200x800`
      }
    }
  } catch (e) {
    // ignore and return original
  }
  return url
}

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
  // Manual location picker state
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [manualCity, setManualCity] = useState("")
  const cityOptions = [
    { name: "Lilongwe", latitude: -13.9833, longitude: 33.7833 },
    { name: "Blantyre", latitude: -15.7879, longitude: 35.0133 },
    { name: "Mzuzu", latitude: -11.4656, longitude: 34.0207 },
    { name: "Zomba", latitude: -15.3850, longitude: 35.3186 },
    { name: "Mangochi", latitude: -14.4781, longitude: 35.2645 }
  ]
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
  
  const { userLocation, selectedLocation, setSelectedLocation } = useLocation()

  // On mount, check for manual location in localStorage and set if present
  useEffect(() => {
    const stored = localStorage.getItem('tigawane_manual_location')
    if (stored) {
      try {
        const loc = JSON.parse(stored)
        if (loc && loc.latitude && loc.longitude) {
          setSelectedLocation(loc)
        }
      } catch {}
    }
  }, [setSelectedLocation])

  // Fetch community stats from database with caching
  useEffect(() => {
    async function loadCommunityStats() {
      setStatsLoading(true)
      try {
        const stats = await fetchCommunityStats()
        setCommunityStats(stats)
      } catch (error) {
        console.error('Error fetching community stats:', error)
        // Keep default values on error
      } finally {
        setStatsLoading(false)
      }
    }
    loadCommunityStats()
  }, [])

  // Memoize fetchNearbyItems to prevent recreation
  const fetchNearbyItems = useCallback(async () => {
    if (!selectedLocation) {
      setNearbyLoading(false)
      return
    }
    
    // Check cache first
    const cacheKey = generateCacheKey('nearby', {
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude,
    });
    const cached = nearbyItemsCache.get<NearbyItem[]>(cacheKey);
    if (cached) {
      console.log('✅ Using cached nearby items');
      setNearbyItems(cached);
      setNearbyLoading(false);
      return;
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
      
      // Cache the results
      nearbyItemsCache.set(cacheKey, itemsWithDistance, CACHE_TTL.NEARBY_ITEMS);
      setNearbyItems(itemsWithDistance)
    } catch (error) {
      console.error('Error fetching nearby items:', error)
      setNearbyItems([])
    } finally {
      setNearbyLoading(false)
    }
  }, [selectedLocation]);

  // Fetch nearby items when user location is available
  useEffect(() => {
    fetchNearbyItems()
  }, [fetchNearbyItems])

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
  }, [fetchNearbyItems]);

  // Fetch stories with caching
  useEffect(() => {
    async function loadStories() {
      try {
        const data = await fetchStories(4)
        if (data && data.length > 0) {
          setStories(data)
        } else {
          setStories(dummyStories)
        }
      } catch (error) {
        console.error('Error fetching stories:', error)
        setStories(dummyStories)
      }
    }
    loadStories()
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
      {/* Hero Section - Optimized for viewport */}
      <section ref={heroRef} className="relative bg-gradient-to-r from-green-600 to-blue-500 text-white min-h-[60vh] sm:min-h-[65vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {HERO_IMAGES.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ${
                index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
              }`}
            >
              <Image
                src={image}
                alt={HERO_IMAGE_ALT}
                fill
                style={{ objectFit: 'cover' }}
                priority={index === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 to-blue-500/80" />
        </div>

        {/* Floating Elements - Reduced for better performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-12 h-12 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute top-20 right-20 w-10 h-10 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <Heart className="absolute top-16 right-16 w-6 h-6 text-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Users className="absolute bottom-20 right-12 w-5 h-5 text-white/40 animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-7 relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold drop-shadow-lg animate-fade-in-up leading-tight" style={{ animationDelay: '0.2s' }}>
              <span className="block text-yellow-300">Tigawane</span>
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">Community Sharing</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto text-white/90 drop-shadow animate-fade-in-up leading-relaxed px-2" style={{ animationDelay: '0.4s' }}>
              Connect with your neighbors to share food, items, and experiences. 
              <span className="block mt-1.5 sm:mt-2 text-green-200 font-semibold text-sm sm:text-base md:text-lg">Build stronger communities through generous sharing.</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-up w-full max-w-2xl px-4" style={{ animationDelay: '0.6s' }}>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 group w-full sm:w-auto sm:min-w-[200px] lg:min-w-[240px]"
            >
              <span className="mr-2 sm:mr-3 text-lg sm:text-xl lg:text-2xl">🍽️</span>
              Browse Nearby Food
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-2 border-white text-green-600 hover:bg-white hover:text-green-600 font-bold text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto sm:min-w-[200px] lg:min-w-[240px]"
            >
              <ArrowRight className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              Share an Item
            </Button>
          </div>

          {/* Community Stats - Compact */}
          <div className="flex flex-wrap justify-center gap-5 sm:gap-6 lg:gap-8 text-center mt-4 sm:mt-6 lg:mt-8 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="flex flex-col items-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-1 drop-shadow-lg">
                {statsLoading ? '...' : `${communityStats.itemsShared}+`}
              </div>
              <div className="text-xs sm:text-sm text-white/90 font-medium">Items Shared</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-300 mb-1 drop-shadow-lg">
                {statsLoading ? '...' : `${communityStats.communityMembers}+`}
              </div>
              <div className="text-xs sm:text-sm text-white/90 font-medium">Community Members</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-300 mb-1 drop-shadow-lg">
                {statsLoading ? '...' : communityStats.activeCollaborations}
              </div>
              <div className="text-xs sm:text-sm text-white/90 font-medium">Active Collaborations</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Only show if content is below fold */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce hidden sm:block">
          <div className="w-5 h-8 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-white/70 rounded-full mt-1.5 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Featured Sections - Near You & Trending */}
      <section data-section="near-you" className="py-16 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
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
                backgroundImage: "/images/food.avif"   
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
                backgroundImage: "/images/items.avif"
              }
            ].map((category, index) => (
              <Card 
                key={index}
                className={`border-2 border-${category.color}-200 hover:border-${category.color}-400 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group opacity-0 animate-fade-in-up relative overflow-hidden`}
                style={{ animationDelay: category.delay }}
              >
                {/* Background Image */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                  <Image
                    src={normalizeImageUrl(category.backgroundImage)}
                    alt={`${category.title} background`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="pointer-events-none"
                  />
                </div>
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
                image: "/images/ready.avif",
                icon: "🗑️",
                color: "red"
              },
              {
                title: "Pack with Care",
                description: "Clean and pack items with love, knowing they'll bring joy to someone else.",
                image: "/images/tigawaneD.png",
                icon: "📦",
                color: "yellow"
              },
              {
                title: "Share the Blessing",
                description: "Share on Tigawane and connect with neighbors who need what you have.",
                image: "/images/bless1.webp",
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
                <div className="h-48 relative">
                  <Image
                    src={normalizeImageUrl(step.image)}
                    alt={step.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="pointer-events-none"
                  />
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
              className="border-white text-green-600 hover:bg-white hover:text-green-600 font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
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
                  <a 
                    href="#how-it-works" 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">How It Works</span>
                  </a>
                  <a 
                    href="#what-to-share" 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('what-to-share')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">What to Share</span>
                  </a>
                  <a 
                    href="#near-you" 
                    onClick={(e) => {
                      e.preventDefault();
                      const nearYouSection = document.querySelector('[data-section="near-you"]');
                      if (nearYouSection) {
                        nearYouSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        // Fallback: scroll to top and trigger Get Started
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => onGetStarted(), 500);
                      }
                    }}
                    className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Find Items</span>
                  </a>
                  <a 
                    href="#stories" 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                  >
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
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Privacy Policy
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Terms of Service
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Help Center
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
