"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, MessageCircle, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import SubmitStoryModal from "./SubmitStoryModal"
import { supabase } from "@/lib/supabase"
// Unsplash fallback image for Malawi/food sharing
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80" // Replace with a more relevant image if found
// Slideshow images for hero background
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Malawi landscape
  "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80", // African children sharing food
  "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80", // Community sharing
]
const HERO_IMAGE_ALT = "Malawian people sharing food outdoors"

interface LandingPageProps {
  onGetStarted: () => void
}

const dummyStories = [
  {
    name: "Mercy",
    location: "Blantyre",
    story: "I had leftover vegetables from the market. Posted on Tigawane—they were picked up within an hour!",
    color: "green"
  },
  {
    name: "Dan",
    location: "Lilongwe",
    story: "I gave away my son's shoes. They now help a child walk to school every day.",
    color: "blue"
  }
]

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [stories, setStories] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  // For demo, both CTAs use onGetStarted. You can wire to different actions if needed.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="w-full bg-white/90 shadow-sm py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm">
              🤝
            </span>
            <div className="absolute -inset-2 bg-green-600/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700 drop-shadow-sm group-hover:text-green-800 transition-colors duration-300">
              Tigawane
            </h1>
            <p className="text-xs text-green-600 hidden sm:block font-medium">
              Share • Connect • Care
            </p>
          </div>
        </div>
        {/* Placeholder for future nav/CTAs */}
        <div />
      </header>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-green-600 to-blue-500 text-white min-h-[60vh] flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">Reduce Waste, Share Surplus</h1>
          <p className="text-2xl md:text-3xl max-w-2xl mx-auto text-white/90 mb-10 drop-shadow">
            Join Tigawane and help build a sustainable community by sharing items you no longer need
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-10 py-6 shadow-lg rounded-full"
            >
              Share Something Today <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-white text-green-700 font-bold text-xl px-10 py-6 shadow-lg rounded-full"
            >
              See What’s Being Shared
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to start sharing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-2 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">1</span>
                </div>
                <CardTitle className="text-xl">Post what you want to give</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Food, clothes, shoes, utensils, baby items—you name it. Just snap a pic, write a short description,
                  and share.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <CardTitle className="text-xl">Others in your area see the item</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Neighbors can comment, message, or request to pick it up.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <CardTitle className="text-xl">Meet up and share</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Once they collect it, it's done. No money. Just community.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What You Can Share Section */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What You Can Share on Tigawane</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🍚</span>
                  <CardTitle className="text-2xl text-orange-700">Food</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Leftover cooked food (safe to eat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Near-expiry groceries</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Garden produce</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Extra flour, rice, sugar, etc.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👕</span>
                  <CardTitle className="text-2xl text-blue-700">Non-Food Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Clothes & shoes in good condition</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Kids' school uniforms</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Blankets & household goods</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Baby supplies (bottles, wipes, etc.)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Real Stories</h2>
            <p className="text-xl text-gray-600">See how Tigawane is changing lives</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((s, i) => (
              <Card key={i} className={`border-l-4 border-l-${s.color || (i % 2 === 0 ? "green" : "blue")}-500`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-${s.color || (i % 2 === 0 ? "green" : "blue")}-100 rounded-full flex items-center justify-center`}>
                      <span className={`text-${s.color || (i % 2 === 0 ? "green" : "blue")}-600 font-bold`}>
                        {s.name[0]}
                      </span>
                    </div>
                    <div>
                      <blockquote className="text-lg italic text-gray-700 mb-3">
                        "{s.story}"
                      </blockquote>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {s.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-4">Want to be featured? Share your Tigawane moment!</p>
            <Button
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => setModalOpen(true)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
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
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-8">Why Tigawane Exists</h2>
          <div className="space-y-6 text-lg">
            <p>Malawi loses tons of edible food every day—while thousands go hungry.</p>
            <p>Families throw away clothes, utensils, and goods that others desperately need.</p>
            <p className="text-2xl font-bold text-green-400">Tigawane changes that.</p>
            <p>We connect neighbors through generosity and dignity.</p>
            <blockquote className="text-xl italic text-green-300 border-l-4 border-green-400 pl-6 my-8">
              "Let's share" is not just our name. It's our movement.
            </blockquote>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Share or Receive?</h2>
          <p className="text-xl mb-8">
            Join other Malawians creating a culture of generosity.
            <br />
            List your first item in seconds—food or non-food.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-10 py-6 shadow-lg rounded-full"
            >
              Share Something Today <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-white text-green-700 font-bold text-xl px-10 py-6 shadow-lg rounded-full"
            >
              See What’s Being Shared
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤝</span>
                <span className="text-xl font-bold">Tigawane</span>
              </div>
              <p className="text-gray-400">Connecting Malawians through generosity and community sharing.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-gray-400">
                <p>📱 WhatsApp: +265 986 445 261</p>
                <p>📧 hello.tigawane@gmail.com</p>
                <p>🌍 Malawi-based</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <div className="space-y-2 text-gray-400">
                <p>💬 Facebook Page: <a href="web.facebook.com/profile.php?id=61577024777762" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Tigawane</a></p>
              </div>  
            </div>

            <div>
              <h3 className="font-semibold mb-4">About</h3>
              <div className="space-y-2 text-gray-400">
                <p>🛠 Built with love for Malawi</p>
                <p>❤️ Community-driven</p>
                <p>🌱 Sustainable sharing</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Tigawane. Built with love for the people of Malawi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
