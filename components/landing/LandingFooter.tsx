"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface LandingFooterProps {
  onGetStarted: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
}

export default function LandingFooter({ onGetStarted, sectionRef }: LandingFooterProps) {
  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToNearYou = () => {
    const nearYouSection = document.querySelector('[data-section="near-you"]');
    if (nearYouSection) {
      nearYouSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => onGetStarted(), 500);
    }
  };

  return (
    <footer ref={sectionRef} className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-900/10 to-blue-900/10"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-500/5 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-500/5 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="py-16">
          <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 gap-8">
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

            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
              <div className="space-y-3">
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToSection('how-it-works');
                  }}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">How It Works</span>
                </a>
                <a 
                  href="#what-to-share" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToSection('what-to-share');
                  }}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">What to Share</span>
                </a>
                <a 
                  href="#near-you" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToNearYou();
                  }}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Find Items</span>
                </a>
                <a 
                  href="#stories" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToSection('stories');
                  }}
                  className="block text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">Success Stories</span>
                </a>
              </div>
            </div>

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
                    handleScrollToSection('how-it-works');
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Privacy Policy
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToSection('how-it-works');
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Terms of Service
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToSection('how-it-works');
                  }}
                  className="hover:text-green-400 transition-colors duration-300"
                >
                  Help Center
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

