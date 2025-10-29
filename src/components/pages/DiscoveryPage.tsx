import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Play, Heart, Share2, MoreHorizontal, Filter, Music, Search, Send } from 'lucide-react'
import { cn } from '@utils'
import { searchMusic, type Track } from '@services/searchService'
import { useAuth } from '@hooks/useAuth'
import { providerService } from '@services/providerService'
import { deepLinkService } from '@services/deepLinkService'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import PageBanner from '@components/ui/PageBanner'
import SignInModal from '@components/ui/SignInModal'
import TrackActionsMenu from '@components/ui/TrackActionsMenu'

interface MusicDiscoveryProps {
  className?: string
}

const GENRES = [
  { value: 'all', label: 'All Genres' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hip-hop', label: 'Hip-Hop' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'country', label: 'Country' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' },
]

const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'chill', label: 'Chill', emoji: '😌' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'party', label: 'Party', emoji: '🎉' },
]

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

const DISCOVERY_TYPES = [
  { value: 'trending', label: 'Trending' },
  { value: 'recommendations', label: 'Recommended' },
  { value: 'new-releases', label: 'New Releases' },
]

export default function MusicDiscovery({ className }: MusicDiscoveryProps) {
  const { isAuthenticated, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('all')
  // Keep using 'auto' internally but don't show the filter
  const selectedProvider = 'auto'
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null)

  // Initialize search query from URL parameters
  useEffect(() => {
    const queryParam = searchParams.get('q')
    if (queryParam) {
      setSearchQuery(queryParam)
      setHasSearched(true)
      setShowFilters(true)
    }
  }, [searchParams])

  // Search function with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTracks([])
      setHasSearched(false)
      setShowFilters(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const results = await searchMusic(searchQuery, { 
          genre: selectedGenre !== 'all' ? selectedGenre : undefined 
        })
        setTracks(results)
        setHasSearched(true)
        setShowFilters(true) // Show filters after first search
        
        // Update URL with search query
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.set('q', searchQuery)
        setSearchParams(newSearchParams, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setTracks([])
      } finally {
        setIsLoading(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedGenre, selectedProvider, searchParams, setSearchParams])

  // Load connected providers when authenticated
  useEffect(() => {
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

  const handlePlayTrack = async (track: Track) => {
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

  const handleLikeTrack = async (track: Track) => {
    try {
      if (isAuthenticated) {
        // Add to favorites collection
        // TODO: Implement collection service
        console.log('Adding track to favorites:', track.title)
        // Show success feedback
      } else {
        // Store track info for pending action
        setPendingTrack(track)
        setShowSignInModal(true)
      }
    } catch (error) {
      console.error('Error liking track:', error)
    }
  }

  const handleShareTrack = async (track: Track) => {
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
          text: `Check out this track: ${track.title}`,
          url: shareUrl
        })
      } else {
        navigator.clipboard.writeText(shareUrl)
      }
    }
  }

  const handlePostTrack = async (track: Track) => {
    try {
      if (!isAuthenticated || !user?.id) {
        setPendingTrack(track)
        setShowSignInModal(true)
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

  const handleSignInModalClose = () => {
    setShowSignInModal(false)
    setPendingTrack(null)
  }

  const handleSignInModalSignIn = () => {
    // Store pending track in localStorage
    if (pendingTrack) {
      const pendingFavorite = {
        trackId: pendingTrack.id,
        title: pendingTrack.title,
        artist: pendingTrack.artist,
        artwork: pendingTrack.artwork,
        url: pendingTrack.url,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('pendingFavorite', JSON.stringify(pendingFavorite))
    }
    
    // Redirect to sign-in
    window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname)
  }

  const handleSignInModalSignUp = () => {
    // Store pending track in localStorage
    if (pendingTrack) {
      const pendingFavorite = {
        trackId: pendingTrack.id,
        title: pendingTrack.title,
        artist: pendingTrack.artist,
        artwork: pendingTrack.artwork,
        url: pendingTrack.url,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('pendingFavorite', JSON.stringify(pendingFavorite))
    }
    
    // Redirect to sign-up
    window.location.href = '/signup?redirect=' + encodeURIComponent(window.location.pathname)
  }

  const handleRetrySearch = () => {
    if (searchQuery.trim()) {
      setIsLoading(true)
      setError(null)
      searchMusic(searchQuery).then(results => {
        setTracks(results)
        setIsLoading(false)
      }).catch(err => {
        setError(err instanceof Error ? err.message : 'Search failed')
        setIsLoading(false)
      })
    }
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {/* Banner */}
      <PageBanner
        variant="discovery"
        title="Discover Music"
        subtitle="Share the Beat"
        description="Find trending tracks, get personalized recommendations, and discover new music across all genres"
      />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for songs, artists, or paste a music link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Filter Controls - Only show after search */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6"
              >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search Filters
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Hide Filters
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Genre Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Genre
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {GENRES.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {genre.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={handleRetrySearch}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : hasSearched && tracks.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No tracks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try searching for a different artist or song name
              </p>
              <div className="text-sm text-gray-400">
                <p>Search tips:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Try just the artist name (e.g., "Drake")</li>
                  <li>• Use partial names (e.g., "Taylor" for Taylor Swift)</li>
                  <li>• Check spelling and try variations</li>
                </ul>
              </div>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start searching for music
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Enter an artist name, song title, or paste a music link to get started
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Search Results for "{searchQuery}"
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tracks.length} tracks found
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tracks.map((track, index) => (
                  <motion.div
                    key={`${track.provider}-${track.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
                  >
                    {/* Track Artwork */}
                    <div className="relative aspect-square rounded-t-lg overflow-hidden">
                      <img
                        src={track.artwork || '/placeholder-music.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-music.jpg'
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                        <button
                          onClick={() => handlePlayTrack(track)}
                          className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100"
                        >
                          <Play className="w-6 h-6 text-gray-900 ml-1" />
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {track.provider}
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {track.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm truncate mb-2">
                        {track.artist}
                      </p>
                      {track.album && (
                        <p className="text-gray-500 dark:text-gray-500 text-xs truncate mb-3">
                          {track.album}
                        </p>
                      )}

                      {/* Track Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLikeTrack(track)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Like track"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareTrack(track)}
                            className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                            aria-label="Share track"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePostTrack(track)}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                            aria-label="Post track"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                        <TrackActionsMenu
                          track={track}
                          onLike={() => handleLikeTrack(track)}
                          onShare={() => handleShareTrack(track)}
                          onAddToPlaylist={() => console.log('Add to playlist:', track.title)}
                          onDownload={() => console.log('Download:', track.title)}
                          onOpenOriginal={() => window.open(track.url, '_blank')}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={handleSignInModalClose}
        onSignIn={handleSignInModalSignIn}
        onSignUp={handleSignInModalSignUp}
        trackData={pendingTrack ? {
          title: pendingTrack.title,
          artist: pendingTrack.artist,
          artwork: pendingTrack.artwork
        } : undefined}
      />
    </div>
  )
}