import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Music, Users, TrendingUp, Heart, Play, Share2, RefreshCw, Send } from 'lucide-react'
import { cn } from '@utils'
import { getTrendingTracks, type TrendingTrack } from '@services/trendingService'
import { useAuth } from '@hooks/useAuth'
import { providerService } from '@services/providerService'
import { deepLinkService } from '@services/deepLinkService'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import { InFeedAd } from '@components/ads/GoogleAd'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [trendingError, setTrendingError] = useState<string | null>(null)
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])

  // Load trending tracks and connected providers on component mount
  useEffect(() => {
    loadTrendingTracks()
    if (isAuthenticated) {
      loadConnectedProviders()
    }
  }, [isAuthenticated])

  const loadConnectedProviders = async () => {
    try {
      const providers = await providerService.getConnectedProviders()
      setConnectedProviders(providers)
    } catch (error) {
      console.error('Error loading connected providers:', error)
    }
  }

  const loadTrendingTracks = async () => {
    setIsLoadingTrending(true)
    setTrendingError(null)
    
    try {
      const tracks = await getTrendingTracks('all', 6) // Show top 6
      setTrendingTracks(tracks)
    } catch (error) {
      console.error('Error loading trending tracks:', error)
      setTrendingError('Failed to load trending music')
    } finally {
      setIsLoadingTrending(false)
    }
  }

  const handlePlayTrack = async (track: TrendingTrack) => {
    try {
      if (isAuthenticated && connectedProviders.length > 0) {
        // Use user's primary connected provider
        const primaryProvider = connectedProviders[0]
        await deepLinkService.openInProvider(track, primaryProvider.provider)
      } else {
        // Show TrackShare link with provider selection
        const shareLink = await deepLinkService.generateShareLink(track)
        window.open(`/t/${shareLink.shortId}`, '_blank')
      }
    } catch (error) {
      console.error('Error playing track:', error)
      // Fallback to original URL
      window.open(track.url, '_blank')
    }
  }

  const handleLikeTrack = async (track: TrendingTrack) => {
    try {
      if (isAuthenticated) {
        // Add to favorites collection
        // TODO: Implement collection service
        console.log('Adding track to favorites:', track.title)
        // Show success feedback
      } else {
        // Store track info in localStorage for pending action
        const pendingFavorite = {
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          url: track.url,
          timestamp: new Date().toISOString()
        }
        
        localStorage.setItem('pendingFavorite', JSON.stringify(pendingFavorite))
        
        // Show auth modal with message
        // TODO: Show auth modal with "Sign in to save your favorites" message
        console.log('Track saved for later - sign in to add to favorites')
        
        // For now, just show a simple alert
        alert('Sign in to save your favorites! This track will be added to your favorites when you sign up.')
      }
    } catch (error) {
      console.error('Error liking track:', error)
    }
  }

  const handleShareTrack = async (track: TrendingTrack) => {
    try {
      // Generate TrackShare link with all provider options
      const shareLink = await deepLinkService.generateShareLink(track)
      
      // Show share modal or use native share
      if (navigator.share) {
        await navigator.share({
          title: `${track.title} - ${track.artist}`,
          text: `Listen to ${track.title} on your favorite music platform!`,
          url: `https://trackshare.online/t/${shareLink.shortId}`
        })
      } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(`https://trackshare.online/t/${shareLink.shortId}`)
        // TODO: Show toast notification
      }
    } catch (error) {
      console.error('Error sharing track:', error)
      // Fallback to simple URL sharing
      const shareUrl = `${window.location.origin}/t/${track.id}`
      if (navigator.share) {
        navigator.share({
          title: `${track.title} by ${track.artist}`,
          text: `Check out this trending track: ${track.title}`,
          url: shareUrl
        })
      } else {
        navigator.clipboard.writeText(shareUrl)
      }
    }
  }

  const handlePostTrack = async (track: TrendingTrack) => {
    try {
      if (!isAuthenticated || !user?.id) {
        alert('Please sign in to post tracks to your feed')
        navigate('/auth')
        return
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'track',
          track: {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: track.artwork || track.artworkMedium,
            url: track.url,
            provider: track.provider || 'itunes'
          },
          userId: user.id
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || 'Failed to create post')
      }

      const data = await response.json()
      console.log('Track posted successfully:', data)
      
      // TODO: Show toast notification
      alert('Track posted to your feed!')
    } catch (error) {
      console.error('Error posting track:', error)
      alert(`Failed to post track: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Discover Music
              <br />
              <span className="text-yellow-300">Share the Beat</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            >
              Find trending tracks, get personalized recommendations, and connect with friends who love music as much as you do.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button 
                onClick={() => navigate('/discovery')}
                className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                Start Discovering
              </button>
              <button 
                onClick={() => navigate('/trending')}
                className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary-600 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                Learn More
              </button>
            </motion.div>
          </div>
        </div>

        {/* Floating Music Notes Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/20"
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
                rotate: 0
              }}
              animate={{ 
                y: -50,
                rotate: 360
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                ease: 'linear',
                delay: Math.random() * 2
              }}
            >
              <Music className="w-8 h-8" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending Music Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trending Now
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Discover what's hot right now across all music platforms
            </p>
          </div>

          {isLoadingTrending ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : trendingError ? (
            <div className="text-center py-12">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 dark:text-red-400 mb-4">{trendingError}</p>
                <button
                  onClick={loadTrendingTracks}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trendingTracks.slice(0, 6).map((track, index) => (
                <React.Fragment key={track.id}>
                  {/* Add ad after 3rd track */}
                  {index === 2 && (
                    <div className="md:col-span-2 lg:col-span-3 flex justify-center">
                      <InFeedAd className="max-w-300px" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
                  >
                  {/* Track Artwork */}
                  <div className="relative aspect-square rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={track.artwork || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzEzMy42IDEwMCAxMjAgMTEzLjYgMTIwIDEzMEMxMjAgMTQ2LjQgMTMzLjYgMTYwIDE1MCAxNjBDMTY2LjQgMTYwIDE4MCAxNDYuNCAxODAgMTMwQzE4MCAxMTMuNiAxNjYuNCAxMDAgMTUwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAxNDBDMTQyLjMgMTQwIDEzNiAxNDYuMyAxMzYgMTU0QzEzNiAxNjEuNyAxNDIuMyAxNjggMTUwIDE2OEMxNTcuNyAxNjggMTY0IDE2MS43IDE2NCAxNTRDMTY0IDE0Ni4zIDE1Ny43IDE0MCAxNTAgMTQwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'}
                      alt={`${track.title} by ${track.artist}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzEzMy42IDEwMCAxMjAgMTEzLjYgMTIwIDEzMEMxMjAgMTQ2LjQgMTMzLjYgMTYwIDE1MCAxNjBDMTY2LjQgMTYwIDE4MCAxNDYuNCAxODAgMTMwQzE4MCAxMTMuNiAxNjYuNCAxMDAgMTUwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAxNDBDMTQyLjMgMTQwIDEzNiAxNDYuMyAxMzYgMTU0QzEzNiAxNjEuNyAxNDIuMyAxNjggMTUwIDE2OEMxNTcuNyAxNjggMTY0IDE2MS43IDE2NCAxNTRDMTY0IDE0Ni4zIDE1Ny43IDE0MCAxNTAgMTQwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 active:bg-opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100 min-h-[56px] min-w-[56px] touch-manipulation cursor-pointer select-none"
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      >
                        <Play className="w-6 h-6 text-gray-900 ml-1" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-primary-500 text-white text-sm font-bold px-2 py-1 rounded">
                      #{track.position}
                    </div>
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {track.provider}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                      {track.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm truncate mb-2">
                      {track.artist}
                    </p>
                    {track.album && (
                      <p className="text-gray-500 dark:text-gray-500 text-xs truncate mb-4">
                        {track.album}
                      </p>
                    )}

                    {/* Track Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleLikeTrack(track)}
                          className="p-3 text-gray-400 hover:text-red-500 active:text-red-500 transition-colors min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
                          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                          aria-label="Like track"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleShareTrack(track)}
                          className="p-3 text-gray-400 hover:text-primary-500 active:text-primary-500 transition-colors min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
                          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                          aria-label="Share track"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePostTrack(track)}
                          className="p-3 text-gray-400 hover:text-blue-500 active:text-blue-500 transition-colors min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
                          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                          aria-label="Post track"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Trending
                      </span>
                    </div>
                  </div>
                </motion.div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* View More Button */}
          <div className="text-center mt-12">
            <button 
              onClick={() => navigate('/trending')}
              className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              View All Trending
            </button>
          </div>
        </div>
      </section>
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose TrackShare?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Experience music discovery like never before with our innovative features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Trending Music',
                description: 'Discover what\'s hot right now across all music platforms and genres.',
                color: 'text-blue-500'
              },
              {
                icon: Users,
                title: 'Social Discovery',
                description: 'Connect with friends and see what they\'re listening to in real-time.',
                color: 'text-green-500'
              },
              {
                icon: Heart,
                title: 'Personalized',
                description: 'Get recommendations tailored to your unique music taste and preferences.',
                color: 'text-red-500'
              }
            ].map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow"
                >
                  <div className={cn('w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center', feature.color)}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Start Your Musical Journey?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of music lovers who are already discovering and sharing amazing tracks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/signup')}
              className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              Get Started Free
            </button>
            <button 
              onClick={() => navigate('/trending')}
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              View Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}