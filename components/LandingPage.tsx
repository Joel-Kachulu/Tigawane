"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { calculateDistance } from "@/lib/locationService";
import { fetchCommunityStats, fetchStories } from "@/lib/dataFetching";
import { nearbyItemsCache, generateCacheKey, CACHE_TTL } from "@/lib/cache";
import LandingHeader from "./landing/LandingHeader";
import HeroSection from "./landing/HeroSection";
import NearbyItemsSection from "./landing/NearbyItemsSection";
import HowItWorksSection from "./landing/HowItWorksSection";
import WhatToShareSection from "./landing/WhatToShareSection";
import WasteToShareSection from "./landing/WasteToShareSection";
import StoriesSection from "./landing/StoriesSection";
import MissionSection from "./landing/MissionSection";
import CTASection from "./landing/CTASection";
import LandingFooter from "./landing/LandingFooter";

interface LandingPageProps {
  onGetStarted: () => void;
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
];

interface CommunityStats {
  itemsShared: number;
  communityMembers: number;
  activeCollaborations: number;
}

interface NearbyItem {
  id: string;
  title: string;
  item_type: 'food' | 'non-food';
  distance: number;
  emoji: string;
  category?: string;
}

// Normalize external links (e.g., Unsplash page URLs) to direct image URLs usable in CSS/background-image.
function normalizeImageUrl(url: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Handle unsplash page links like https://unsplash.com/photos/<slug>-<id>
    if (u.hostname.includes('unsplash.com') && u.pathname.startsWith('/photos/')) {
      // split path into segments and pick the last meaningful segment
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || '';
      // Unsplash page slugs often contain hyphen-separated slug and id (e.g. 'photo-slug-abc123')
      const id = last.split('-').pop();
      if (id) {
        // Use source.unsplash which redirects to the actual image
        return `https://source.unsplash.com/${id}/1200x800`;
      }
    }
  } catch (e) {
    // ignore and return original
  }
  return url;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [stories, setStories] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    itemsShared: 0,
    communityMembers: 0,
    activeCollaborations: 0
  });
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  
  const { selectedLocation, setSelectedLocation } = useLocation();

  // On mount, check for manual location in localStorage and set if present
  useEffect(() => {
    const stored = localStorage.getItem('tigawane_manual_location');
    if (stored) {
      try {
        const loc = JSON.parse(stored);
        if (loc && loc.latitude && loc.longitude) {
          setSelectedLocation(loc);
        }
      } catch {}
    }
  }, [setSelectedLocation]);

  // Fetch community stats from database with caching
  useEffect(() => {
    async function loadCommunityStats() {
      setStatsLoading(true);
      try {
        const stats = await fetchCommunityStats();
        setCommunityStats(stats);
      } catch (error) {
        console.error('Error fetching community stats:', error);
        // Keep default values on error
      } finally {
        setStatsLoading(false);
      }
    }
    loadCommunityStats();
  }, []);

  // Memoize fetchNearbyItems to prevent recreation
  const fetchNearbyItems = useCallback(async () => {
    if (!selectedLocation) {
      setNearbyLoading(false);
      return;
    }
    
    // Check cache first
    const cacheKey = generateCacheKey('nearby', {
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude,
    });
    const cached = nearbyItemsCache.get<NearbyItem[]>(cacheKey);
    if (cached) {
      setNearbyItems(cached);
      setNearbyLoading(false);
      return;
    }
    
    setNearbyLoading(true);
    try {
      // Create a bounding box around the user's location (approximately 10km radius)
      const kmPerDegree = 111; // Rough approximation: 1 degree ≈ 111 km
      const radiusInDegrees = 10 / kmPerDegree; // 10km radius
      const minLat = selectedLocation.latitude - radiusInDegrees;
      const maxLat = selectedLocation.latitude + radiusInDegrees;
      const minLng = selectedLocation.longitude - radiusInDegrees;
      const maxLng = selectedLocation.longitude + radiusInDegrees;
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
        .limit(50); // Increased limit since we're pre-filtering with bounding box
        
      if (error) {
        console.error('Error fetching nearby items:', error);
        setNearbyItems([]);
        return;
      }
      
      if (!itemsData || itemsData.length === 0) {
        setNearbyItems([]);
        return;
      }
      
      // Calculate distances and sort by proximity
      const itemsWithDistance = itemsData
        .map(item => {
          const distance = calculateDistance(
            selectedLocation.latitude,
            selectedLocation.longitude,
            item.pickup_lat,
            item.pickup_lon
          );
          // Assign emoji based on category or type
          let emoji = "📦";
          if (item.item_type === "food") {
            emoji = item.category === "fruits" ? "🍎" : 
                    item.category === "vegetables" ? "🥕" : 
                    item.category === "grain" ? "🌾" : "🍽️";
          } else {
            emoji = item.category === "clothing" ? "👕" : 
                    item.category === "books" ? "📚" : 
                    item.category === "baby" ? "👶" : "📦";
          }
          return {
            id: item.id,
            title: item.title,
            item_type: item.item_type,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            emoji,
            category: item.category
          };
        })
        .filter(item => item.distance <= 5) // Only show items within 5km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Show only 5 closest items
      
      // Cache the results
      nearbyItemsCache.set(cacheKey, itemsWithDistance, CACHE_TTL.NEARBY_ITEMS);
      setNearbyItems(itemsWithDistance);
    } catch (error) {
      console.error('Error fetching nearby items:', error);
      setNearbyItems([]);
    } finally {
      setNearbyLoading(false);
    }
  }, [selectedLocation]);

  // Fetch nearby items when user location is available
  useEffect(() => {
    fetchNearbyItems();
  }, [fetchNearbyItems]);

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
        const data = await fetchStories(4);
        if (data && data.length > 0) {
          setStories(data);
        } else {
          setStories(dummyStories);
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
        setStories(dummyStories);
      }
    }
    loadStories();
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Initial animation trigger
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-x-hidden relative">
      {/* Global Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
      </div>
      
      <LandingHeader onGetStarted={onGetStarted} isVisible={isVisible} />
      
      <HeroSection
        onGetStarted={onGetStarted}
        isVisible={isVisible}
        communityStats={communityStats}
        statsLoading={statsLoading}
      />
      
      <NearbyItemsSection
        nearbyItems={nearbyItems}
        nearbyLoading={nearbyLoading}
        selectedLocation={selectedLocation}
        onGetStarted={onGetStarted}
      />
      
      <HowItWorksSection sectionRef={(el) => { sectionRefs.current[0] = el as HTMLElement }} />
      
      <WhatToShareSection
        sectionRef={(el) => { sectionRefs.current[1] = el as HTMLElement }}
        normalizeImageUrl={normalizeImageUrl}
      />
      
      <WasteToShareSection
        sectionRef={(el) => { sectionRefs.current[2] = el as HTMLElement }}
        normalizeImageUrl={normalizeImageUrl}
      />
      
      <StoriesSection
        stories={stories}
        sectionRef={(el) => { sectionRefs.current[3] = el as HTMLElement }}
        onOpenModal={() => setModalOpen(true)}
        modalOpen={modalOpen}
        onCloseModal={() => setModalOpen(false)}
      />
      
      <MissionSection sectionRef={(el) => { sectionRefs.current[4] = el as HTMLElement }} />
      
      <CTASection
        onGetStarted={onGetStarted}
        sectionRef={(el) => { sectionRefs.current[5] = el as HTMLElement }}
      />
      
      <LandingFooter
        onGetStarted={onGetStarted}
        sectionRef={(el) => { sectionRefs.current[6] = el as HTMLElement }}
      />
    </div>
  );
}
