import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from 'react-query'
import { Play, Heart, Share2, MoreHorizontal, Filter, Music } from 'lucide-react'
import { cn } from '@utils'
import { apiService } from '@services/apiService'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import type { Track, SearchFilters } from '@types'

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
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all')
  const [selectedDiscoveryType, setSelectedDiscoveryType] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Fetch tracks based on current filters
  const {
    data: tracksData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['tracks', selectedGenre, selectedMood, selectedTimeFilter, selectedDiscoveryType, searchQuery],
    () => {
      const filters: SearchFilters = {
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        mood: selectedMood || undefined,
        timeFilter: selectedTimeFilter !== 'all' ? selectedTimeFilter as any : undefined,
        type: selectedDiscoveryType as any,
      }

      if (searchQuery) {
        return apiService.searchTracks(searchQuery, filters)
      } else {
        return apiService.getTracks({
          genre: selectedGenre !== 'all' ? selectedGenre : undefined,
          limit: 20,
        })
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  const tracks = tracksData?.data || []
  const hasMore = tracksData?.pagination?.has_more || false

  const handlePlayTrack = (track: Track) => {
    // TODO: Implement track playing functionality
    console.log('Playing track:', track.title)
  }

  const handleLikeTrack = (track: Track) => {
    // TODO: Implement track liking functionality
    console.log('Liking track:', track.title)
  }

  const handleShareTrack = (track: Track) => {
    // TODO: Implement track sharing functionality
    console.log('Sharing track:', track.title)
  }

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
  }

  const handleMoodChange = (mood: string | null) => {
    setSelectedMood(mood)
  }

  const handleTimeFilterChange = (timeFilter: string) => {
    setSelectedTimeFilter(timeFilter)
  }

  const handleDiscoveryTypeChange = (type: string) => {
    setSelectedDiscoveryType(type)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className={cn('min-h-screen bg-white dark:bg-gray-900', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Discover Music
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find trending tracks, get personalized recommendations, and discover new music across all genres.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <Music className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for songs, artists, or paste a music link..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Discovery Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Discovery Filters
            </h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-primary-500 hover:text-primary-600 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Advanced
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Genre Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {GENRES.map((genre) => (
                  <option key={genre.value} value={genre.value}>
                    {genre.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Discovery Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={selectedDiscoveryType}
                onChange={(e) => handleDiscoveryTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {DISCOVERY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Period
              </label>
              <select
                value={selectedTimeFilter}
                onChange={(e) => handleTimeFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {TIME_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mood Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mood
              </label>
              <select
                value={selectedMood || ''}
                onChange={(e) => handleMoodChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Any Mood</option>
                {MOODS.map((mood) => (
                  <option key={mood.value} value={mood.value}>
                    {mood.emoji} {mood.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Popularity
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="all">All Popularity</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="all">Any Duration</option>
                      <option value="short">Short (&lt; 3 min)</option>
                      <option value="medium">Medium (3-5 min)</option>
                      <option value="long">Long (&gt; 5 min)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="all">Any Year</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="older">Older</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results */}
        <div className="mb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">Failed to load tracks</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No tracks found. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Discover Music'}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tracks.length} tracks
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
                  >
                    {/* Track Artwork */}
                    <div className="relative aspect-square rounded-t-lg overflow-hidden">
                      <img
                        src={track.artwork || track.artworkMedium || '/placeholder-music.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                        <button
                          onClick={() => handlePlayTrack(track)}
                          className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100"
                        >
                          <Play className="w-6 h-6 text-gray-900 ml-1" />
                        </button>
                      </div>
                      {track.explicit && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                          E
                        </div>
                      )}
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
                        </div>
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                    Load More Tracks
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}