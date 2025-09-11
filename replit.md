# Overview

Tigawane is a community sharing platform designed for Malawi that enables users to share food and non-food items within their local communities. The platform focuses on reducing waste and strengthening community bonds by connecting people who have items to share with those who need them. The application features location-based filtering to help users find nearby items, collaboration tools for community organizing, and a comprehensive chat system for coordination.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components for consistent UI design
- **State Management**: React Context API for authentication and location state
- **Component Structure**: Modular component architecture with reusable UI components

## Backend Architecture
- **Database**: Supabase (PostgreSQL) for data storage and real-time functionality
- **Authentication**: Supabase Auth with custom profile management
- **Real-time Features**: Supabase real-time subscriptions for chat and notifications
- **File Storage**: Supabase Storage for item images

## Data Storage Solutions
- **Primary Database**: PostgreSQL through Supabase with tables for:
  - `profiles` - User information with location coordinates
  - `items` - Food and non-food items with GPS coordinates
  - `claims` - Item requests and claim management
  - `messages` - Chat system for item coordination
  - `collaboration_requests` - Community collaboration organizing
  - `notifications` - Real-time user notifications
  - `stories` - Community success stories
- **Location Data**: GPS coordinates stored for both users and items with distance calculation functions
- **Image Storage**: Supabase bucket storage for item photographs

## Authentication and Authorization
- **User Authentication**: Supabase Auth with email/password
- **Admin System**: Role-based access control with `admin_users` table
- **Profile Management**: Automatic profile creation with location data
- **Session Management**: Context-based authentication state management

## Location-Based Features
- **GPS Integration**: Browser geolocation API for current position
- **Geocoding**: OpenStreetMap integration for address-to-coordinates conversion
- **Distance Calculation**: Haversine formula implementation for proximity filtering
- **City Selection**: Predefined Malawi cities with coordinate mapping
- **Radius Filtering**: Configurable search radius from 1km to 100km

## Communication System
- **Item Claims**: Request system for item sharing with messaging
- **Real-time Chat**: Supabase real-time subscriptions for instant messaging
- **Collaboration Chat**: Group messaging for community organizing
- **Notifications**: Real-time notification system for user engagement

## Admin Dashboard
- **Content Management**: Admin interface for managing items, users, and reports
- **Analytics**: Usage statistics and community insights
- **Story Management**: Moderation system for community success stories
- **User Management**: User suspension and account management tools

# External Dependencies

## Primary Services
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, authentication, real-time subscriptions, and file storage
- **OpenStreetMap**: Geocoding service for converting addresses to GPS coordinates
- **Browser Geolocation API**: Device location services for GPS positioning

## UI and Styling
- **shadcn/ui**: React component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **Radix UI**: Headless UI primitives for accessibility and functionality

## Development Tools
- **Next.js**: React framework with App Router for routing and SSR
- **TypeScript**: Static typing for improved development experience
- **React Query/TanStack Query**: Data fetching and caching (configured but usage unclear)
- **Class Variance Authority**: Utility for managing component variants

## Image and Media
- **Next.js Image**: Optimized image loading and display
- **Image optimization**: Built-in Next.js image optimization pipeline

## Location Services
- **Malawi Cities Database**: Hardcoded coordinates for major Malawi cities (Lilongwe, Blantyre, Mzuzu, etc.)
- **Distance Calculation**: Custom Haversine formula implementation for GPS distance calculation