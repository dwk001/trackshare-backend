import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock, Music, Users, ExternalLink, Filter, Search } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { cn } from '@utils'
import { eventService, type EventSearchParams } from '@services/eventService'
import { type MusicEvent } from '@types'
import PageBanner from '@components/ui/PageBanner'
import LoadingSpinner from '@components/ui/LoadingSpinner'


const GENRES = ['All', 'Hip-Hop', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Mixed']
const LOCATIONS = ['All Locations', 'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Austin, TX', 'Nashville, TN', 'Brooklyn, NY', 'Miami, FL', 'Seattle, WA', 'Boston, MA', 'Louisville, KY']

export default function EventsPage() {
  const [events, setEvents] = useState<MusicEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<MusicEvent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedLocation, setSelectedLocation] = useState('All Locations')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchRadius, setSearchRadius] = useState(15) // Default 15 miles
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const searchParams: EventSearchParams = {
          query: searchQuery || 'music concert',
          location: selectedLocation !== 'All Locations' ? selectedLocation : undefined,
          radius: searchRadius,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          genre: selectedGenre !== 'All' ? selectedGenre : undefined
        }
        
        const eventsData = await eventService.searchEvents(searchParams)
        setEvents(eventsData)
        setFilteredEvents(eventsData)
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Failed to load events. Please try again.')
        // Fallback to empty array
        setEvents([])
        setFilteredEvents([])
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEvents()
  }, [searchQuery, selectedLocation, searchRadius, startDate, endDate, selectedGenre])

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events

    // Search filter - now includes location, zip codes, cities, states
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(event => {
        const searchableText = [
          event.title,
          event.artist,
          event.venue,
          event.location,
          event.genre
        ].join(' ').toLowerCase()
        
        // Check if query matches any part of the searchable text
        return searchableText.includes(query) ||
               // Check for zip code patterns (5 digits)
               (query.match(/^\d{5}$/) && event.location.includes(query)) ||
               // Check for city, state combinations
               event.location.toLowerCase().includes(query)
      })
    }

    // Genre filter
    if (selectedGenre !== 'All') {
      filtered = filtered.filter(event => event.genre === selectedGenre)
    }

    // Location filter
    if (selectedLocation !== 'All Locations') {
      filtered = filtered.filter(event => event.location === selectedLocation)
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(event => event.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(event => event.date <= endDate)
    }

    setFilteredEvents(filtered)
  }, [events, searchQuery, selectedGenre, selectedLocation, startDate, endDate])

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const searchParams: EventSearchParams = {
        query: searchQuery || 'music concert',
        location: selectedLocation !== 'All Locations' ? selectedLocation : undefined,
        radius: searchRadius,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        genre: selectedGenre !== 'All' ? selectedGenre : undefined
      }
      
      const eventsData = await eventService.searchEvents(searchParams)
      setEvents(eventsData)
      setFilteredEvents(eventsData)
    } catch (err) {
      console.error('Error searching events:', err)
      setError('Failed to search events. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEventClick = (event: MusicEvent) => {
    // In a real app, this would open the event details or external ticket site
    window.open(event.url, '_blank')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banner */}
      <PageBanner
        variant="events"
        title="Music Events"
        subtitle="Live & Local"
        description="Discover live music events, concerts, and festivals happening near you"
      />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events, artists, venues, cities, states, or zip codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/20"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Genre Filter */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Genre
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {GENRES.map(genre => (
                      <option key={genre} value={genre} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {LOCATIONS.map(location => (
                      <option key={location} value={location} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Search Radius Filter */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Search Radius
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="5"
                      max="1000"
                      step="5"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem]">
                      {searchRadius === 1000 ? 'Nationwide' : `${searchRadius} mi`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>5 mi</span>
                    <span>Nationwide</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading events...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading events
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Events State */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your search criteria or location
            </p>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Search Again
            </button>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleEventClick(event)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              {/* Event Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEwMCIgcj0iNDAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNjAgODBIMjQwVjEyMEgxNjBWODBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
                  }}
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-sm font-medium">{event.genre}</span>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {event.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{event.artist}</p>

                {/* Event Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{event.venue}, {event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{event.time}</span>
                  </div>
                  {event.attendees && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{event.attendees.toLocaleString()} attendees</span>
                    </div>
                  )}
                </div>

                {/* Price and Action */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{event.price}</span>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Get Tickets
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}
