import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Heart, Play, Share2, RefreshCw, Filter, Send } from 'lucide-react'
import { cn } from '@utils'
import { getTrendingTracks, type TrendingTrack } from '@services/trendingService'
import { useAuth } from '@hooks/useAuth'
import { providerService } from '@services/providerService'
import { deepLinkService } from '@services/deepLinkService'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import PageBanner from '@components/ui/PageBanner'
import { InFeedAd } from '@components/ads/GoogleAd'

export default function TrendingPage() {
  const { isAuthenticated, user } = useAuth()
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [trendingError, setTrendingError] = useState<string | null>(null)
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const genres = [
    { id: 'all', name: 'All Genres' },
    { id: 'pop', name: 'Pop' },
    { id: 'rock', name: 'Rock' },
    { id: 'hip-hop', name: 'Hip-Hop' },
    { id: 'electronic', name: 'Electronic' },
    { id: 'country', name: 'Country' },
    { id: 'jazz', name: 'Jazz' },
    { id: 'classical', name: 'Classical' },
  ]

  // Load trending tracks
  useEffect(() => {
    const loadTrendingTracks = async () => {
      try {
        setIsLoadingTrending(true)
        setTrendingError(null)
        
        const tracks = await getTrendingTracks(selectedGenre === 'all' ? undefined : selectedGenre)
        setTrendingTracks(tracks)
      } catch (error) {
        console.error('Error loading trending tracks:', error)
        setTrendingError('Failed to load trending tracks. Please try again.')
      } finally {
        setIsLoadingTrending(false)
      }
    }

    loadTrendingTracks()
  }, [selectedGenre])

  // Load connected providers
  useEffect(() => {
    const loadConnectedProviders = async () => {
      try {
        const providers = await providerService.getConnectedProviders()
        setConnectedProviders(providers)
      } catch (error) {
        console.error('Error loading connected providers:', error)
      }
    }

    if (isAuthenticated) {
      loadConnectedProviders()
    }
  }, [isAuthenticated])

  const handlePlayTrack = async (track: TrendingTrack) => {
    try {
      if (isAuthenticated && connectedProviders.length > 0) {
        // If user has connected providers, open in their preferred service
        const primaryProvider = connectedProviders[0]
        await deepLinkService.openInProvider(track as any, primaryProvider.provider)
      } else {
        // Show provider selection modal
        console.log('Show provider selection for:', track.title)
        // TODO: Implement provider selection modal
      }
    } catch (error) {
      console.error('Error playing track:', error)
    }
  }

  const handleLikeTrack = async (track: TrendingTrack) => {
    try {
      if (!isAuthenticated) {
        // Store pending favorite and prompt for sign-in
        localStorage.setItem('pendingFavorite', JSON.stringify({
          trackId: track.id,
          trackTitle: track.title,
          trackArtist: track.artist,
          trackArtwork: track.artwork
        }))
        
        // Redirect to sign-in with return URL
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname)
        return
      }

      // TODO: Implement like track functionality
      console.log('Liking track:', track.title)
    } catch (error) {
      console.error('Error liking track:', error)
    }
  }

  const handleShareTrack = async (track: TrendingTrack) => {
    try {
      const shareLink = await deepLinkService.generateShareLink(track as any)
      
      if (navigator.share) {
        await navigator.share({
          title: `${track.title} by ${track.artist}`,
          text: `Check out this track: ${track.title} by ${track.artist}`,
          url: shareLink.url
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareLink.url)
        // TODO: Show toast notification
        console.log('Share link copied to clipboard')
      }
    } catch (error) {
      console.error('Error sharing track:', error)
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
      
      alert('Track posted to your feed!')
    } catch (error) {
      console.error('Error posting track:', error)
      alert(`Failed to post track: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRefresh = () => {
    const loadTrendingTracks = async () => {
      try {
        setIsLoadingTrending(true)
        setTrendingError(null)
        
        const tracks = await getTrendingTracks(selectedGenre === 'all' ? undefined : selectedGenre)
        setTrendingTracks(tracks)
      } catch (error) {
        console.error('Error loading trending tracks:', error)
        setTrendingError('Failed to load trending tracks. Please try again.')
      } finally {
        setIsLoadingTrending(false)
      }
    }

    loadTrendingTracks()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banner */}
      <PageBanner
        variant="trending"
        title="Trending Music"
        subtitle="Discover what's hot right now"
        description="Find the most popular tracks across all music platforms and genres"
        buttons={{
          primary: {
            text: 'Refresh',
            onClick: handleRefresh,
            className: isLoadingTrending ? 'opacity-50 cursor-not-allowed' : ''
          },
          secondary: {
            text: 'View All',
            onClick: () => navigate('/discovery')
          }
        }}
      />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              {showFilters && (
                <div className="flex items-center space-x-2">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                        selectedGenre === genre.id
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      )}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {trendingTracks.length} tracks found
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingTrending ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        ) : trendingError ? (
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">{trendingError}</div>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trendingTracks.map((track, index) => (
              <React.Fragment key={track.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300"
                >
                  {/* Track Artwork */}
                  <div className="relative aspect-square">
                    <img
                      src={track.artwork || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzEzMy42IDEwMCAxMjAgMTEzLjYgMTIwIDEzMEMxMjAgMTQ2LjQgMTMzLjYgMTYwIDE1MCAxNjBDMTY2LjQgMTYwIDE4MCAxNDYuNCAxODAgMTMwQzE4MCAxMTMuNiAxNjYuNCAxMDAgMTUwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAxNDBDMTQyLjMgMTQwIDEzNiAxNDYuMyAxMzYgMTU0QzEzNiAxNjEuNyAxNDIuMyAxNjggMTUwIDE2OEMxNTcuNyAxNjggMTY0IDE2MS43IDE2NCAxNTRDMTY0IDE0Ni4zIDE1Ny43IDE0MCAxNTAgMTQwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'}
                      alt={`${track.title} by ${track.artist}`}
                      className="w-full h-full object-cover"
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
                      {track.source}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 truncate">
                      {track.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 truncate">
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

                {/* Ad placement every 6 tracks */}
                {(index + 1) % 6 === 0 && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <InFeedAd />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
