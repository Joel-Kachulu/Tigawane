"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, MessageCircle, MapPin } from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <div className="flex justify-center items-center gap-3 mb-6">
              <span className="text-6xl">🤝</span>
              <h1 className="text-5xl md:text-7xl font-bold">Tigawane</h1>
            </div>

            <h2 className="text-2xl md:text-4xl font-bold max-w-4xl mx-auto leading-tight">
              Don't Waste It. Share It. <br />
              <span className="text-yellow-300">Empower Your Community.</span>
            </h2>

            <p className="text-xl md:text-2xl max-w-3xl mx-auto text-green-100">
              Malawi's first free sharing platform for <strong>food and essential items</strong>.<br />
              Post what you don't need. Receive what you do.
              <br />
              <strong>Together, we fight hunger, reduce waste, and uplift our neighbors.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <div className="flex items-center gap-2 text-green-100">
                <span className="text-green-300">✅</span>
                <span>Share leftover food</span>
              </div>
              <div className="flex items-center gap-2 text-green-100">
                <span className="text-green-300">✅</span>
                <span>Give away clothes & shoes</span>
              </div>
              <div className="flex items-center gap-2 text-green-100">
                <span className="text-green-300">✅</span>
                <span>Help your community</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-4"
              >
                Join the Movement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={onGetStarted}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-green-700 font-bold text-lg px-8 py-4"
              >
                List an Item Now
              </Button>
            </div>
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
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">M</span>
                  </div>
                  <div>
                    <blockquote className="text-lg italic text-gray-700 mb-3">
                      "I had leftover vegetables from the market. Posted on Tigawane—they were picked up within an
                      hour!"
                    </blockquote>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Mercy</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Blantyre
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">D</span>
                  </div>
                  <div>
                    <blockquote className="text-lg italic text-gray-700 mb-3">
                      "I gave away my son's shoes. They now help a child walk to school every day."
                    </blockquote>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Dan</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Lilongwe
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-4">Want to be featured? Share your Tigawane moment!</p>
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              <MessageCircle className="mr-2 h-4 w-4" />
              Submit your story
            </Button>
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
            Join over <strong>1,000+</strong> Malawians creating a culture of generosity.
            <br />
            List your first item in seconds—food or non-food.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-4"
            >
              List an Item Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={onGetStarted}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-700 font-bold text-lg px-8 py-4"
            >
              Explore Available Listings
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
                <p>📱 WhatsApp: Click to Message Us</p>
                <p>📧 hello@tigawane.org</p>
                <p>🌍 Malawi-based</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <div className="space-y-2 text-gray-400">
                <p>💬 Facebook Page</p>
                <p>📱 WhatsApp Groups</p>
                <p>📧 Newsletter</p>
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
            <p>&copy; 2024 Tigawane. Built with love for the people of Malawi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
