import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useProfile } from '@hooks/useProfile'
import { 
  User, 
  Edit3, 
  Settings, 
  Heart, 
  Music, 
  Users, 
  Calendar,
  MapPin,
  Globe,
  Camera,
  Mail,
  Phone,
  Link,
  CheckCircle
} from 'lucide-react'
import { cn } from '@utils'
import AuthModal from '@components/auth/AuthModal'
import LoadingSpinner from '@components/ui/LoadingSpinner'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { profile, isLoading: isProfileLoading, error: profileError } = useProfile()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to view your profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create an account or sign in to access your personalized profile.
          </p>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Sign In
          </button>
        </div>
        
        <AuthModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode="signin"
        />
      </div>
    )
  }

  // Show loading state while fetching profile
  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show error state
  if (profileError && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error loading profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {profileError instanceof Error ? profileError.message : 'Failed to load profile data'}
          </p>
        </div>
      </div>
    )
  }

  // Use profile data or fallback to auth user data
  const displayName = profile?.display_name || user?.displayName || user?.name || 'Anonymous User'
  const avatar = profile?.avatar_url || user?.avatar
  const username = profile?.username || user?.email?.split('@')[0] || 'user'
  const email = profile?.email || user?.email
  const bio = profile?.bio
  const location = profile?.location
  const website = profile?.website
  const birthDate = profile?.birth_date
  const stats = profile?.stats || { tracksShared: 0, followers: 0, following: 0 }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={avatar || '/placeholder-avatar.jpg'}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-600 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {displayName}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    @{username}
                  </p>
                  {bio && (
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                      {bio}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Profile Stats */}
              <div className="flex space-x-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.tracksShared}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tracks Shared
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.followers}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Followers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.following}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Following
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {/* TODO: Fetch real activity from Supabase posts/activity table */}
                <div className="text-center py-8">
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No activity yet. Start sharing tracks to see your activity here!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Top Tracks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Tracks This Month
              </h2>
              <div className="space-y-3">
                {/* TODO: Fetch real top tracks from user listening history */}
                <div className="text-center py-8">
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No tracks yet. Connect a music provider and start listening to see your top tracks here!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                {email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {email}
                    </span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {location}
                    </span>
                  </div>
                )}
                {website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {website}
                    </a>
                  </div>
                )}
                {birthDate && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Born {new Date(birthDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Account Settings
                  </span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Music className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    My Playlists
                  </span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Find Friends
                  </span>
                </button>
              </div>
            </motion.div>

            {/* Connected Providers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Connected Music Services
              </h3>
              {profile?.connected_providers && Object.keys(profile.connected_providers).length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {Object.keys(profile.connected_providers).map((providerId) => {
                    const providerNames: Record<string, string> = {
                      spotify: 'Spotify',
                      soundcloud: 'SoundCloud',
                      youtube_music: 'YouTube Music',
                      tidal: 'Tidal',
                      apple_music: 'Apple Music'
                    }
                    const providerIcons: Record<string, string> = {
                      spotify: '🎵',
                      soundcloud: '☁️',
                      youtube_music: '📺',
                      tidal: '🌊',
                      apple_music: '🍎'
                    }
                    return (
                      <div
                        key={providerId}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                      >
                        <span>{providerIcons[providerId] || '🎵'}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {providerNames[providerId] || providerId}
                        </span>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Link className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    No music services connected
                  </p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Connect Services →
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="profile"
      />
    </div>
  )
}